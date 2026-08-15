package telegram

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"errors"
	"fmt"
	"log"
	"time"

	"prosper/ledger/common"
	"prosper/model"
	"prosper/userdb"
)

// store is the unexported data-access layer over the four Telegram tables.
type store struct {
	db *userdb.DB
}

func newStore(db *userdb.DB) *store { return &store{db: db} }

// linkTokenBytes is the entropy of a link token: 256 bits.
const linkTokenBytes = 32

// LinkToken returns the user's live link token, minting and storing a fresh
// one only when they hold none or theirs has expired.
func (s *store) LinkToken(ctx context.Context, userID int32) (string, error) {
	tx, err := s.db.BeginTx(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback()
	var current model.TelegramLinkToken
	err = tx.GetForUser(ctx, &current, userID,
		// FOR UPDATE locks the row so two concurrent reads of the link status
		// can't both decide to replace it: the second waits, then sees what the
		// first stored and keeps it.
		`SELECT * FROM TelegramLinkToken WHERE userId = :userId FOR UPDATE`)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return "", err
	}
	if err == nil && time.Now().Before(current.ExpiresAt) {
		if err := tx.Commit(); err != nil {
			return "", err
		}
		return current.Token, nil
	}
	token, err := newLinkToken()
	if err != nil {
		return "", err
	}
	if _, err := tx.ExecForUser(ctx, userID,
		`DELETE FROM TelegramLinkToken WHERE userId = :userId`); err != nil {
		return "", err
	}
	if _, err := tx.NamedExecForUser(ctx, userID,
		`INSERT INTO TelegramLinkToken
		         (userId,  token,  expiresAt)
		 VALUES (:userId, :token, :expiresAt)`,
		model.TelegramLinkToken{UserID: userID, Token: token, ExpiresAt: time.Now().Add(linkTokenTTL)}); err != nil {
		return "", err
	}
	if err := tx.Commit(); err != nil {
		return "", err
	}
	return token, nil
}

// newLinkToken mints a URL-safe single-use link token.
func newLinkToken() (string, error) {
	b := make([]byte, linkTokenBytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
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
		// FOR UPDATE locks the row so two concurrent /start taps on the same
		// token can't both read it before either deletes it: the second
		// waits, then finds it gone, keeping the token single-use.
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
		log.Printf("telegram: chat=%d already linked to user=%d, refused link for user=%d", chatID, owner, userID)
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

// DeleteLink disconnects the user's chat and drops any outstanding link
// token, so an explicit disconnect fully resets the user's link state.
func (s *store) DeleteLink(ctx context.Context, userID int32) error {
	tx, err := s.db.BeginTx(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.ExecForUser(ctx, userID,
		`DELETE FROM TelegramLink WHERE userId = :userId`); err != nil {
		return err
	}
	if _, err := tx.ExecForUser(ctx, userID,
		`DELETE FROM TelegramLinkToken WHERE userId = :userId`); err != nil {
		return err
	}
	return tx.Commit()
}

// CreateNotification claims a draft and records the delivery in one
// transaction: the notification row plus one origin row per origin.
func (s *store) CreateNotification(ctx context.Context, userID int32, chatID int64, msg model.TelegramMessage, origins []common.OriginKey) (int32, error) {
	tx, err := s.db.BeginTx(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	res, err := tx.NamedExecForUser(ctx, userID,
		`INSERT INTO TelegramNotification
		        ( userId,  chatId,  kind,  title,  body)
		 VALUES (:userId, :chatId, :kind, :title, :body)`,
		model.TelegramNotification{UserID: userID, ChatID: chatID, TelegramMessage: msg})
	if err != nil {
		return 0, err
	}
	notificationID, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}
	rows := make([]model.TelegramNotificationOrigin, len(origins))
	for i, o := range origins {
		rows[i] = model.TelegramNotificationOrigin{
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

// NotifiedOrigins returns every origin the user has already been messaged
// about.
func (s *store) NotifiedOrigins(ctx context.Context, userID int32) (map[common.OriginKey]bool, error) {
	var rows []model.TelegramNotificationOrigin
	if err := s.db.SelectForUser(ctx, &rows, userID,
		`SELECT * FROM TelegramNotificationOrigin WHERE userId = :userId`); err != nil {
		return nil, err
	}
	keys, err := originKeys(rows)
	if err != nil {
		return nil, err
	}
	notified := make(map[common.OriginKey]bool, len(keys))
	for _, k := range keys {
		notified[k] = true
	}
	return notified, nil
}

// originKeys converts stored origin rows to the source events they name.
func originKeys(rows []model.TelegramNotificationOrigin) ([]common.OriginKey, error) {
	keys := make([]common.OriginKey, 0, len(rows))
	for _, r := range rows {
		kind, ok := model.ParseSourceOriginKind(r.OriginKind)
		if !ok {
			return nil, fmt.Errorf("telegram: notification=%d user=%d origin key=%q has unknown kind %q",
				r.NotificationID, r.UserID, r.OriginKey, r.OriginKind)
		}
		keys = append(keys, common.OriginKey{Kind: kind, Key: r.OriginKey})
	}
	return keys, nil
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
	var rows []model.TelegramNotificationOrigin
	if err := s.db.SelectForUser(ctx, &rows, userID,
		`SELECT * FROM TelegramNotificationOrigin WHERE userId = :userId AND notificationId = :id`,
		map[string]any{"id": notificationID}); err != nil {
		return model.TelegramNotification{}, nil, false, err
	}
	keys, err := originKeys(rows)
	if err != nil {
		return model.TelegramNotification{}, nil, false, err
	}
	return notif, keys, true, nil
}

// UpdateNotificationMessage rewrites the message a later Add tap verifies
// against.
func (s *store) UpdateNotificationMessage(ctx context.Context, userID, notificationID int32, msg model.TelegramMessage) error {
	_, err := s.db.ExecForUser(ctx, userID,
		`UPDATE TelegramNotification SET kind = :kind, title = :title, body = :body
		  WHERE userId = :userId AND id = :id`,
		map[string]any{"kind": msg.Kind, "title": msg.Title, "body": msg.Body, "id": notificationID})
	return err
}
