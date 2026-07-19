package telegram

import (
	"context"
	"errors"
	"log"
	"strconv"
	"strings"
	"sync"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger"
	"prosper/ledger/common"
	"prosper/ledger/txform"
	"prosper/suggest"
	"prosper/userdb"
)

// Bot runs the long-poll loop and routes inbound updates: /start deep
// links and Add / Ignore callback taps.
type Bot struct {
	db           *userdb.DB
	store        *store
	client       *Client
	pipeline     *suggest.Pipeline
	publicAppURL string
}

// NewBot constructs the bot with everything it needs to resolve and
// write drafts through the same paths the web form uses.
func NewBot(db *userdb.DB, client *Client, pipeline *suggest.Pipeline, publicAppURL string) *Bot {
	return &Bot{
		db:           db,
		store:        newStore(db),
		client:       client,
		pipeline:     pipeline,
		publicAppURL: publicAppURL,
	}
}

// Start launches the poll loop as a tracked background goroutine.
func (b *Bot) Start(ctx context.Context, wg *sync.WaitGroup) {
	wg.Go(func() {
		for ctx.Err() == nil {
			if _, err := b.client.Username(ctx); err != nil {
				log.Printf("telegram: getMe: %v", err)
				if !sleepCtx(ctx, getMeRetryBackoff) {
					return
				}
				continue
			}
			break
		}
		log.Println("telegram: bot polling for updates")
		var offset int64
		for ctx.Err() == nil {
			updates, err := b.client.GetUpdates(ctx, offset, longPollTimeout)
			if err != nil {
				if ctx.Err() != nil {
					return
				}
				log.Printf("telegram: getUpdates: %v", err)
				if !sleepCtx(ctx, pollErrorBackoff) {
					return
				}
				continue
			}
			for _, u := range updates {
				offset = u.UpdateID + 1
				b.route(ctx, u)
			}
		}
		log.Println("telegram: bot stopping")
	})
}

func (b *Bot) route(ctx context.Context, u Update) {
	switch {
	case u.CallbackQuery != nil:
		b.handleCallback(ctx, u.CallbackQuery)
	case u.Message != nil && strings.HasPrefix(u.Message.Text, "/start"):
		b.handleStart(ctx, u.Message.Chat.ID, startToken(u.Message.Text))
	}
}

// startToken extracts the token from a "/start <token>" command, or
// returns "" when none was supplied.
func startToken(text string) string {
	fields := strings.Fields(text)
	if len(fields) < 2 {
		return ""
	}
	return fields[1]
}

func (b *Bot) handleStart(ctx context.Context, chatID int64, token string) {
	if token == "" {
		b.send(ctx, chatID, msgStartNoToken)
		return
	}
	userID, err := b.store.ConsumeLinkToken(ctx, token)
	if err != nil {
		if !errors.Is(err, errTokenInvalid) {
			log.Printf("telegram: consume token chat=%d: %v", chatID, err)
		}
		b.send(ctx, chatID, msgLinkExpired)
		return
	}
	if err := b.store.LinkChat(ctx, userID, chatID); err != nil {
		if errors.Is(err, errChatLinkedElsewhere) {
			b.send(ctx, chatID, msgChatLinkedElsewhere)
			return
		}
		log.Printf("telegram: link chat user=%d chat=%d: %v", userID, chatID, err)
		b.send(ctx, chatID, msgLinkFailed)
		return
	}
	b.send(ctx, chatID, msgConnected)
}

func (b *Bot) handleCallback(ctx context.Context, cb *CallbackQuery) {
	if cb.Message == nil {
		b.answer(ctx, cb.ID, "")
		return
	}
	action, notificationID, ok := parseCallback(cb.Data)
	if !ok {
		b.answer(ctx, cb.ID, "")
		return
	}
	chatID := cb.Message.Chat.ID
	userID, linked, err := b.store.UserForChat(ctx, chatID)
	if err != nil {
		log.Printf("telegram: callback user for chat=%d: %v", chatID, err)
		b.answer(ctx, cb.ID, msgActionFailed)
		return
	}
	if !linked {
		b.answer(ctx, cb.ID, "")
		return
	}
	notification, origins, ok, err := b.store.NotificationForUser(ctx, userID, notificationID)
	if err != nil {
		log.Printf("telegram: callback load notification user=%d id=%d: %v", userID, notificationID, err)
		b.answer(ctx, cb.ID, msgActionFailed)
		return
	}
	if !ok {
		b.answer(ctx, cb.ID, msgNoLongerSuggested)
		return
	}
	switch action {
	case actionIgnore:
		b.handleIgnore(ctx, cb, userID, origins)
	case actionAdd:
		b.handleAdd(ctx, cb, userID, notification.ID, notification.MessageText, origins)
	default:
		b.answer(ctx, cb.ID, "")
	}
}

func (b *Bot) handleIgnore(ctx context.Context, cb *CallbackQuery, userID int32, origins []common.OriginKey) {
	if err := ledger.InsertIgnoredOrigins(ctx, b.db, userID, origins, true); err != nil {
		log.Printf("telegram: ignore user=%d: %v", userID, err)
		b.answer(ctx, cb.ID, msgActionFailed)
		return
	}
	b.edit(ctx, cb.Message.Chat.ID, cb.Message.MessageID, msgIgnored, nil)
	b.answer(ctx, cb.ID, "")
}

// handleAdd re-resolves the draft and verifies the rendered summary still
// equals the message text before writing, so a one-tap Add records
// exactly what the message shows.
func (b *Bot) handleAdd(ctx context.Context, cb *CallbackQuery, userID, notificationID int32, messageText string, origins []common.OriginKey) {
	chatID := cb.Message.Chat.ID
	messageID := cb.Message.MessageID
	drafts, err := b.pipeline.Suggest(ctx, userID)
	if err != nil {
		log.Printf("telegram: add suggest user=%d: %v", userID, err)
		b.answer(ctx, cb.ID, msgActionFailed)
		return
	}
	d := findDraftByOrigins(drafts, origins)
	if d == nil {
		b.answer(ctx, cb.ID, msgNoLongerSuggested)
		return
	}
	if d.Ignored {
		b.edit(ctx, chatID, messageID, msgIgnoredInApp, nil)
		b.answer(ctx, cb.ID, "")
		return
	}
	if len(d.RecordedTransactionIds) > 0 {
		b.edit(ctx, chatID, messageID, msgAlreadyRecorded, nil)
		b.answer(ctx, cb.ID, "")
		return
	}
	lu, err := b.store.Lookups(ctx, userID)
	if err != nil {
		log.Printf("telegram: add lookups user=%d: %v", userID, err)
		b.answer(ctx, cb.ID, msgActionFailed)
		return
	}
	text := renderDraft(d, lu)
	if text != messageText {
		if err := b.store.UpdateNotificationText(ctx, userID, notificationID, text); err != nil {
			log.Printf("telegram: add update text user=%d id=%d: %v", userID, notificationID, err)
		}
		b.edit(ctx, chatID, messageID, text, keyboard(notificationID, d, b.publicAppURL))
		b.answer(ctx, cb.ID, msgSuggestionsChanged)
		return
	}
	req, err := suggest.WriteRequestFromDraft(d)
	if err != nil {
		log.Printf("telegram: add convert user=%d id=%d: %v", userID, notificationID, err)
		b.answer(ctx, cb.ID, msgCouldNotAdd)
		return
	}
	if _, err := txform.Write(ctx, b.db, userID, req); err != nil {
		log.Printf("telegram: add write user=%d id=%d: %v", userID, notificationID, err)
		b.answer(ctx, cb.ID, msgCouldNotAdd)
		return
	}
	b.edit(ctx, chatID, messageID, addedSummary(d, lu), nil)
	b.answer(ctx, cb.ID, "")
}

// findDraftByOrigins returns the draft that shares at least one origin
// with the notification, or nil when the draft has aged out of the
// suggestion window
func findDraftByOrigins(drafts []*prosperv1.TransactionDraft, origins []common.OriginKey) *prosperv1.TransactionDraft {
	want := make(map[common.OriginKey]bool, len(origins))
	for _, o := range origins {
		want[o] = true
	}
	for _, d := range drafts {
		for _, o := range d.Origins {
			kind, ok := common.OriginKindToModel(o.Kind)
			if !ok {
				continue
			}
			if want[common.OriginKey{Kind: kind, Key: o.Key}] {
				return d
			}
		}
	}
	return nil
}

// parseCallback splits "add:42" / "ignore:42" into its action and notification id.
func parseCallback(data string) (string, int32, bool) {
	action, idText, found := strings.Cut(data, ":")
	if !found {
		return "", 0, false
	}
	id, err := strconv.Atoi(idText)
	if err != nil {
		return "", 0, false
	}
	return action, int32(id), true
}

func (b *Bot) send(ctx context.Context, chatID int64, text string) {
	if _, err := b.client.SendMessage(ctx, chatID, text, nil); err != nil {
		log.Printf("telegram: send chat=%d: %v", chatID, err)
	}
}

func (b *Bot) edit(ctx context.Context, chatID, messageID int64, text string, kb *InlineKeyboard) {
	if err := b.client.EditMessageText(ctx, chatID, messageID, text, kb); err != nil {
		log.Printf("telegram: edit chat=%d message=%d: %v", chatID, messageID, err)
	}
}

func (b *Bot) answer(ctx context.Context, callbackID, text string) {
	if err := b.client.AnswerCallbackQuery(ctx, callbackID, text); err != nil {
		log.Printf("telegram: answer callback=%s: %v", callbackID, err)
	}
}
