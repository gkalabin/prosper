package telegram

import (
	"context"
	"log"
	"time"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger/common"
	"prosper/ledger/snapshot"
	"prosper/suggest"
	"prosper/userdb"
)

// OpenBankingReader reports which of a user's open-banking transactions
// were stored after a cutoff, keyed by external transaction id. The
// notifier uses it to message only about transactions discovered since the
// chat was linked.
type OpenBankingReader interface {
	ExternalTransactionIDsCreatedAfter(ctx context.Context, userID int32, after time.Time) (map[string]bool, error)
}

// Notifier implements openbanking.ScheduledSyncObserver: turns freshly
// fetched bank transactions into Telegram messages.
type Notifier struct {
	db           *userdb.DB
	store        *store
	client       *Client
	pipeline     *suggest.Pipeline
	openBanking  OpenBankingReader
	publicAppURL string
}

// NewNotifier constructs the notifier.
func NewNotifier(db *userdb.DB, client *Client, pipeline *suggest.Pipeline, openBanking OpenBankingReader, publicAppURL string) *Notifier {
	return &Notifier{
		db:           db,
		store:        newStore(db),
		client:       client,
		pipeline:     pipeline,
		openBanking:  openBanking,
		publicAppURL: publicAppURL,
	}
}

// OnScheduledSync messages the user about every notifiable draft
// discovered since they linked their chat.
func (n *Notifier) OnScheduledSync(ctx context.Context, userID int32) {
	link, linked, err := n.store.Link(ctx, userID)
	if err != nil {
		log.Printf("telegram: notify user=%d: load link: %v", userID, err)
		return
	}
	if !linked {
		return // user has not opted in
	}
	snap, err := snapshot.Load(ctx, n.db, userID)
	if err != nil {
		log.Printf("telegram: notify user=%d: load ledger: %v", userID, err)
		return
	}
	drafts, err := n.pipeline.Suggest(ctx, userID, snap)
	if err != nil {
		log.Printf("telegram: notify user=%d: suggest: %v", userID, err)
		return
	}
	fresh, err := n.openBanking.ExternalTransactionIDsCreatedAfter(ctx, userID, link.CreatedAt)
	if err != nil {
		log.Printf("telegram: notify user=%d: fresh origins: %v", userID, err)
		return
	}
	notified, err := n.store.NotifiedOrigins(ctx, userID)
	if err != nil {
		log.Printf("telegram: notify user=%d: notified origins: %v", userID, err)
		return
	}
	for _, d := range drafts {
		draftOrigins, err := common.OriginKeysFromProto(d.Origins)
		if err != nil {
			log.Printf("telegram: notify user=%d: draft origins: %v", userID, err)
			continue
		}
		if !notifiable(d, draftOrigins, fresh, notified) {
			continue
		}
		n.send(ctx, userID, link.ChatID, d, draftOrigins, snap)
	}
}

// send claims the draft, then delivers the message.
func (n *Notifier) send(ctx context.Context, userID int32, chatID int64, d *prosperv1.TransactionDraft, draftOrigins []common.OriginKey, snap *snapshot.Ledger) {
	msg, err := renderDraft(d, snap)
	if err != nil {
		log.Printf("telegram: notify user=%d: render draft: %v", userID, err)
		return
	}
	notificationID, err := n.store.CreateNotification(ctx, userID, chatID, msg, draftOrigins)
	if err != nil {
		log.Printf("telegram: notify user=%d: claim draft: %v", userID, err)
		return
	}
	if _, err := n.client.SendMessage(ctx, chatID, formatMessage(msg), buildKeyboard(notificationID, d, n.publicAppURL)); err != nil {
		log.Printf("telegram: send user=%d notification=%d: %v", userID, notificationID, err)
	}
}

// notifiable reports whether the draft is one the user still wants a message about.
func notifiable(d *prosperv1.TransactionDraft, draftOrigins []common.OriginKey, fresh map[string]bool, notified map[common.OriginKey]bool) bool {
	if d.Ignored || len(d.RecordedTransactionIds) > 0 {
		return false
	}
	hasFresh := false
	for _, o := range draftOrigins {
		if notified[o] {
			return false
		}
		if fresh[o.Key] {
			hasFresh = true
		}
	}
	return hasFresh
}
