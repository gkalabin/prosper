package telegram

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"
	"sync"

	"prosper/ledger/common"
	"prosper/ledger/snapshot"
	"prosper/ledger/txform"
	"prosper/model"
	"prosper/suggest"
	"prosper/userdb"
)

// Bot runs the long-poll loop and routes inbound updates: /start deep
// links and Add callback taps.
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

// startCommand links a chat from a t.me deep link; linkCommand links it
// from a code the user types, the manual path shown in settings.
const (
	startCommand = "/start"
	linkCommand  = "/link"
)

func (b *Bot) route(ctx context.Context, u Update) {
	switch {
	case u.CallbackQuery != nil:
		b.handleCallback(ctx, u.CallbackQuery)
	case u.Message == nil:
	case strings.HasPrefix(u.Message.Text, startCommand):
		b.handleStart(ctx, u.Message.Chat.ID, commandToken(u.Message.Text, startCommand))
	case strings.HasPrefix(u.Message.Text, linkCommand):
		b.handleStart(ctx, u.Message.Chat.ID, commandToken(u.Message.Text, linkCommand))
	}
}

// commandToken extracts the token following a command, or "" when none was
// supplied, as in "/start <token>" or "/link <token>".
func commandToken(text, command string) string {
	rest, ok := strings.CutPrefix(text, command)
	if !ok {
		return ""
	}
	return strings.TrimSpace(rest)
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
		// errChatLinkedElsewhere is a chat already owned by another user; the
		// store logs the details. Every failure replies with the same generic
		// message so a reply never reveals whether the chat is already in use.
		if !errors.Is(err, errChatLinkedElsewhere) {
			log.Printf("telegram: link chat user=%d chat=%d: %v", userID, chatID, err)
		}
		b.send(ctx, chatID, msgLinkFailed)
		return
	}
	b.send(ctx, chatID, msgConnected)
}

func (b *Bot) handleCallback(ctx context.Context, cb *CallbackQuery) {
	if cb.Message == nil {
		b.ack(ctx, cb.ID)
		return
	}
	action, notificationID, ok := parseCallback(cb.Data)
	if !ok {
		b.ack(ctx, cb.ID)
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
		b.ack(ctx, cb.ID)
		return
	}
	notification, origins, ok, err := b.store.NotificationForUser(ctx, userID, notificationID)
	if err != nil {
		log.Printf("telegram: callback load notification user=%d id=%d: %v", userID, notificationID, err)
		b.answer(ctx, cb.ID, msgActionFailed)
		return
	}
	if !ok {
		// The callback names a notification row written when the message was
		// sent; not finding it for this user should not happen.
		log.Printf("telegram: callback notification not found user=%d id=%d", userID, notificationID)
		b.answer(ctx, cb.ID, msgActionFailed)
		return
	}
	switch action {
	case actionAdd:
		b.handleAdd(ctx, cb, userID, notification, origins)
	default:
		// parseCallback only admits known actions, so this is unreachable;
		// dismiss the tap rather than leave it spinning if that ever changes.
		log.Printf("telegram: callback unexpected action %q user=%d", action, userID)
		b.ack(ctx, cb.ID)
	}
}

// handleAdd re-resolves the draft and verifies it still renders as the
// message text before writing, so a one-tap Add records exactly what the
// message shows.
func (b *Bot) handleAdd(ctx context.Context, cb *CallbackQuery, userID int32, notification model.TelegramNotification, origins []common.OriginKey) {
	chatID := cb.Message.Chat.ID
	messageID := cb.Message.MessageID
	snap, err := snapshot.Load(ctx, b.db, userID)
	if err != nil {
		log.Printf("telegram: add load ledger user=%d: %v", userID, err)
		b.answer(ctx, cb.ID, msgActionFailed)
		return
	}
	drafts, err := b.pipeline.Suggest(ctx, userID, snap)
	if err != nil {
		log.Printf("telegram: add suggest user=%d: %v", userID, err)
		b.answer(ctx, cb.ID, msgActionFailed)
		return
	}
	d := suggest.DraftByOrigins(drafts, origins)
	if d == nil {
		b.answer(ctx, cb.ID, msgNoLongerSuggested)
		return
	}
	if d.Ignored {
		b.edit(ctx, chatID, messageID, terminalText(msgIgnoredInApp, notification.Title), nil)
		b.ack(ctx, cb.ID)
		return
	}
	if len(d.RecordedTransactionIds) > 0 {
		b.edit(ctx, chatID, messageID, terminalText(msgAlreadyRecorded, notification.Title), nil)
		b.ack(ctx, cb.ID)
		return
	}
	msg, err := renderDraft(d, snap)
	if err != nil {
		log.Printf("telegram: add render user=%d id=%d: %v", userID, notification.ID, err)
		b.answer(ctx, cb.ID, msgCouldNotAdd)
		return
	}
	if msg != notification.TelegramMessage {
		// The draft now renders differently than the message the user tapped:
		// a later sync or a learned mapping changed one of its fields. Adding
		// it now would record something other than what they saw, so refresh
		// the message to the current rendering and make them confirm it again.
		if err := b.store.UpdateNotificationMessage(ctx, userID, notification.ID, msg); err != nil {
			log.Printf("telegram: add update text user=%d id=%d: %v", userID, notification.ID, err)
		}
		b.edit(ctx, chatID, messageID, formatMessage(msg), buildKeyboard(notification.ID, d, b.publicAppURL))
		b.answer(ctx, cb.ID, msgSuggestionsChanged)
		return
	}
	req, err := suggest.WriteRequestFromDraft(d)
	if err != nil {
		log.Printf("telegram: add convert user=%d id=%d: %v", userID, notification.ID, err)
		b.answer(ctx, cb.ID, msgCouldNotAdd)
		return
	}
	if _, err := txform.Write(ctx, b.db, userID, req); err != nil {
		log.Printf("telegram: add write user=%d id=%d: %v", userID, notification.ID, err)
		b.answer(ctx, cb.ID, msgCouldNotAdd)
		return
	}
	b.edit(ctx, chatID, messageID, terminalText(msgAdded, notification.Title), nil)
	b.ack(ctx, cb.ID)
}

func terminalText(outcome, title string) string {
	return outcome + " " + title
}

// formatCallback encodes a button's callback_data as "action:notificationId",
// the form parseCallback decodes.
func formatCallback(action callbackAction, notificationID int32) string {
	return fmt.Sprintf("%s:%d", action, notificationID)
}

// parseCallback splits a button's callback_data ("add:42") into its action
// and notification id, rejecting data whose verb is not a known action.
func parseCallback(data string) (callbackAction, int32, bool) {
	verb, idText, found := strings.Cut(data, ":")
	if !found {
		return "", 0, false
	}
	id, err := strconv.ParseInt(idText, 10, 32)
	if err != nil {
		return "", 0, false
	}
	switch callbackAction(verb) {
	case actionAdd:
		return callbackAction(verb), int32(id), true
	default:
		return "", 0, false
	}
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

// ack dismisses a tap's loading spinner without showing the user a toast,
// the right response when there is nothing to tell them.
func (b *Bot) ack(ctx context.Context, callbackID string) {
	b.answer(ctx, callbackID, "")
}
