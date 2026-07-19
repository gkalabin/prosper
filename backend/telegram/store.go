package telegram

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"prosper/ledger/common"
	"prosper/model"
	"prosper/userdb"
)

// errChatLinkedElsewhere reports that a /start attempt named a chat
// already linked to a different user; the chat is never reassigned.
// TODO: return generic error, do not leak this information.
// TODO: move to the common place with other tg errors/strings.
var errChatLinkedElsewhere = errors.New("telegram: chat already linked to another user")

// errTokenInvalid reports that a link token is unknown or expired.
// TODO: move to the common place with other tg errors/strings.
var errTokenInvalid = errors.New("telegram: link token invalid or expired")

// store is the unexported data-access layer over the four Telegram tables.
type store struct {
	db *userdb.DB
}

func newStore(db *userdb.DB) *store { return &store{db: db} }

// notificationOriginRow is a TelegramNotificationOrigin row.
// TODO: move to the model file.
type notificationOriginRow struct {
	UserID         int32  `db:"userId"`
	OriginKind     string `db:"originKind"`
	OriginKey      string `db:"originKey"`
	NotificationID int32  `db:"notificationId"`
}

// ReplaceLinkToken makes token the user's single outstanding link token,
// discarding any previous one.
func (s *store) ReplaceLinkToken(ctx context.Context, userID int32, token string, expiresAt time.Time) error {
	tx, err := s.db.BeginTx(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.ExecForUser(ctx, userID,
		`DELETE FROM TelegramLinkToken WHERE userId = :userId`); err != nil {
		return err
	}
	if _, err := tx.NamedExecForUser(ctx, userID,
		`INSERT INTO TelegramLinkToken
		         (userId,  token,  expiresAt)
		 VALUES (:userId, :token, :expiresAt)`,
		model.TelegramLinkToken{UserID: userID, Token: token, ExpiresAt: expiresAt}); err != nil {
		return err
	}
	return tx.Commit()
}

// ConsumeLinkToken reads and deletes a token in one transaction so it is
// genuinely single-use, returning the user it belonged to.
func (s *store) ConsumeLinkToken(ctx context.Context, token string) (int32, error) {
	tx, err := s.db.BeginTx(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	var row model.TelegramLinkToken
	err = tx.Raw().GetContext(ctx, &row,
		// TODO: add a short comment why FOR UPDATE is necessary here.
		`SELECT * FROM TelegramLinkToken WHERE token = ? FOR UPDATE`, token)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, errTokenInvalid
	}
	if err != nil {
		return 0, err
	}
	if _, err := tx.Raw().ExecContext(ctx,
		`DELETE FROM TelegramLinkToken WHERE token = ?`, token); err != nil {
		return 0, err
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	if time.Now().After(row.ExpiresAt) {
		return 0, errTokenInvalid
	}
	return row.UserID, nil
}

// LinkChat connects chatID to userID, replacing the user's own previous
// chat. A chat already linked to a different user is refused.
func (s *store) LinkChat(ctx context.Context, userID int32, chatID int64) error {
	tx, err := s.db.BeginTx(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var owner int32
	err = tx.Raw().GetContext(ctx, &owner,
		`SELECT userId FROM TelegramLink WHERE chatId = ?`, chatID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	if err == nil && owner != userID {
		// TODO: log a warning here, this is security sensitive.
		return errChatLinkedElsewhere
	}
	if _, err := tx.ExecForUser(ctx, userID,
		`DELETE FROM TelegramLink WHERE userId = :userId`); err != nil {
		return err
	}
	if _, err := tx.NamedExecForUser(ctx, userID,
		`INSERT INTO TelegramLink ( userId,  chatId) VALUES (:userId, :chatId)`,
		model.TelegramLink{UserID: userID, ChatID: chatID}); err != nil {
		return err
	}
	return tx.Commit()
}

// Link returns the user's linked chat, ok=false when they have none.
func (s *store) Link(ctx context.Context, userID int32) (model.TelegramLink, bool, error) {
	var link model.TelegramLink
	err := s.db.GetForUser(ctx, &link, userID,
		`SELECT * FROM TelegramLink WHERE userId = :userId`)
	if errors.Is(err, sql.ErrNoRows) {
		return model.TelegramLink{}, false, nil
	}
	if err != nil {
		return model.TelegramLink{}, false, err
	}
	return link, true, nil
}

// UserForChat resolves a chat to the user that owns it.
func (s *store) UserForChat(ctx context.Context, chatID int64) (int32, bool, error) {
	var userID int32
	err := s.db.Raw().GetContext(ctx, &userID,
		`SELECT userId FROM TelegramLink WHERE chatId = ?`, chatID)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	return userID, true, nil
}

// DeleteLink disconnects the user's chat, stopping notifications.
func (s *store) DeleteLink(ctx context.Context, userID int32) error {
	// TODO: delete chat here too?
	_, err := s.db.ExecForUser(ctx, userID,
		`DELETE FROM TelegramLink WHERE userId = :userId`)
	return err
}

// OriginsDiscoveredAfter returns the set of open-banking origin keys
// (external transaction ids) the user's feed stored after the cutoff.
// TODO: this should not be here, this file has telegram DB logic, this is openbanking.
func (s *store) OriginsDiscoveredAfter(ctx context.Context, userID int32, after time.Time) (map[string]bool, error) {
	var ids []string
	if err := s.db.SelectForUser(ctx, &ids, userID,
		`SELECT externalTransactionId FROM OpenBankingTransaction
		  WHERE userId = :userId AND createdAt > :after`,
		map[string]any{"after": after}); err != nil {
		return nil, err
	}
	fresh := make(map[string]bool, len(ids))
	for _, id := range ids {
		fresh[id] = true
	}
	return fresh, nil
}

// CreateNotification claims a draft and records the delivery in one
// transaction: the notification row plus one origin row per origin.
func (s *store) CreateNotification(ctx context.Context, userID int32, chatID int64, text string, origins []common.OriginKey) (int32, error) {
	tx, err := s.db.BeginTx(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	res, err := tx.NamedExecForUser(ctx, userID,
		`INSERT INTO TelegramNotification 
		        ( userId,  chatId,  messageText)
		 VALUES (:userId, :chatId, :messageText)`,
		model.TelegramNotification{UserID: userID, ChatID: chatID, MessageText: text})
	if err != nil {
		return 0, err
	}
	notificationID, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}
	rows := make([]notificationOriginRow, len(origins))
	for i, o := range origins {
		rows[i] = notificationOriginRow{
			OriginKind:     string(o.Kind),
			OriginKey:      o.Key,
			NotificationID: int32(notificationID),
		}
	}
	if _, err := tx.NamedExecForUser(ctx, userID,
		`INSERT INTO TelegramNotificationOrigin
		        ( userId,  originKind,  originKey,  notificationId)
		 VALUES (:userId, :originKind, :originKey, :notificationId)`, rows); err != nil {
		return 0, err
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return int32(notificationID), nil
}

// NotificationForUser loads a notification and its origins scoped to the user.
func (s *store) NotificationForUser(ctx context.Context, userID, notificationID int32) (model.TelegramNotification, []common.OriginKey, bool, error) {
	var notif model.TelegramNotification
	err := s.db.GetForUser(ctx, &notif, userID,
		`SELECT * FROM TelegramNotification WHERE userId = :userId AND id = :id`,
		map[string]any{"id": notificationID})
	if errors.Is(err, sql.ErrNoRows) {
		return model.TelegramNotification{}, nil, false, nil
	}
	if err != nil {
		return model.TelegramNotification{}, nil, false, err
	}
	var rows []notificationOriginRow
	if err := s.db.SelectForUser(ctx, &rows, userID,
		`SELECT * FROM TelegramNotificationOrigin WHERE userId = :userId AND notificationId = :id`,
		map[string]any{"id": notificationID}); err != nil {
		return model.TelegramNotification{}, nil, false, err
	}
	origins := make([]common.OriginKey, len(rows))
	for i, r := range rows {
		origins[i] = common.OriginKey{Kind: model.SourceOriginKind(r.OriginKind), Key: r.OriginKey}
	}
	return notif, origins, true, nil
}

// UpdateNotificationText rewrites the stored summary a later Add tap
// verifies against.
func (s *store) UpdateNotificationText(ctx context.Context, userID, notificationID int32, text string) error {
	_, err := s.db.ExecForUser(ctx, userID,
		`UPDATE TelegramNotification SET messageText = :messageText
		  WHERE userId = :userId AND id = :id`,
		map[string]any{"messageText": text, "id": notificationID})
	return err
}

// Lookups loads the id → name (and account currency) maps the renderer
// needs so a message never shows a raw id.
// TODO: use ledger type here. It should be somehow available in this codepath, so plumb it instead of doing a separate lookup.
func (s *store) Lookups(ctx context.Context, userID int32) (lookups, error) {
	var accounts []model.BankAccount
	if err := s.db.SelectForUser(ctx, &accounts, userID,
		`SELECT * FROM BankAccount WHERE userId = :userId`); err != nil {
		return lookups{}, err
	}
	var banks []model.Bank
	if err := s.db.SelectForUser(ctx, &banks, userID,
		`SELECT * FROM Bank WHERE userId = :userId`); err != nil {
		return lookups{}, err
	}
	var categories []model.Category
	if err := s.db.SelectForUser(ctx, &categories, userID,
		`SELECT * FROM Category WHERE userId = :userId`); err != nil {
		return lookups{}, err
	}
	bankNames := make(map[int32]string, len(banks))
	for _, b := range banks {
		bankNames[b.ID] = b.Name
	}
	categoriesByID := make(map[int32]model.Category, len(categories))
	for _, c := range categories {
		categoriesByID[c.ID] = c
	}
	lu := lookups{
		accounts:   make(map[int32]accountInfo, len(accounts)),
		categories: make(map[int32]string, len(categories)),
	}
	for _, a := range accounts {
		info := accountInfo{name: a.Name, bankName: bankNames[a.BankID]}
		if a.CurrencyCode != nil {
			info.currencyCode = *a.CurrencyCode
		}
		lu.accounts[a.ID] = info
	}
	for _, c := range categories {
		lu.categories[c.ID] = categoryPath(c, categoriesByID)
	}
	return lu, nil
}

// categoryPath builds the full "Food > Groceries > Offline" name a message
// shows, since a leaf name alone ("Offline") carries no meaning. A broken
// parent chain (missing link or cycle) stops the walk at the deepest
// resolvable ancestor rather than looping.
// TODO: this should live inside model package.
// TODO: make one function to build category tree and another one to format category name.
func categoryPath(c model.Category, byID map[int32]model.Category) string {
	names := []string{c.Name}
	seen := map[int32]bool{c.ID: true}
	for c.ParentCategoryID != nil {
		parent, ok := byID[*c.ParentCategoryID]
		if !ok || seen[parent.ID] {
			break
		}
		names = append(names, parent.Name)
		seen[parent.ID] = true
		c = parent
	}
	for i, j := 0, len(names)-1; i < j; i, j = i+1, j-1 {
		names[i], names[j] = names[j], names[i]
	}
	return strings.Join(names, categoryPathSeparator)
}
