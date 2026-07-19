package telegram

import (
	"context"
	"log"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger/common"
	"prosper/suggest"
	"prosper/userdb"
)

// Notifier implements openbanking.ScheduledSyncObserver: turns freshly
// fetched bank transactions into Telegram messages.
type Notifier struct {
	store        *store
	client       *Client
	pipeline     *suggest.Pipeline
	publicAppURL string
}

// NewNotifier constructs the notifier.
func NewNotifier(db *userdb.DB, client *Client, pipeline *suggest.Pipeline, publicAppURL string) *Notifier {
	return &Notifier{
		store:        newStore(db),
		client:       client,
		pipeline:     pipeline,
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
	drafts, err := n.pipeline.Suggest(ctx, userID)
	if err != nil {
		log.Printf("telegram: notify user=%d: suggest: %v", userID, err)
		return
	}
	fresh, err := n.store.OriginsDiscoveredAfter(ctx, userID, link.CreatedAt)
	if err != nil {
		log.Printf("telegram: notify user=%d: fresh origins: %v", userID, err)
		return
	}
	lu, err := n.store.Lookups(ctx, userID)
	if err != nil {
		log.Printf("telegram: notify user=%d: lookups: %v", userID, err)
		return
	}
	for _, d := range drafts {
		switch {
		case d.Ignored:
		case len(d.RecordedTransactionIds) > 0: // Already in the ledger.
		case !anyOriginIn(d, fresh): // Discovered before the chat was linked.
		default:
			n.send(ctx, userID, link.ChatID, d, lu)
		}
	}
}

// send claims the draft, then delivers the message.
func (n *Notifier) send(ctx context.Context, userID int32, chatID int64, d *prosperv1.TransactionDraft, lu lookups) {
	origins, err := common.OriginKeysFromProto(d.Origins)
	if err != nil {
		log.Printf("telegram: notify user=%d: draft origins: %v", userID, err)
		return
	}
	text := renderDraft(d, lu)
	notificationID, err := n.store.CreateNotification(ctx, userID, chatID, text, origins)
	if err != nil {
		return
	}
	if _, err := n.client.SendMessage(ctx, chatID, text, keyboard(notificationID, d, n.publicAppURL)); err != nil {
		log.Printf("telegram: send user=%d notification=%d: %v", userID, notificationID, err)
	}
}

// anyOriginIn reports whether any of the draft's origins was discovered
// after the chat was linked.
func anyOriginIn(d *prosperv1.TransactionDraft, fresh map[string]bool) bool {
	for _, o := range d.Origins {
		if fresh[o.Key] {
			return true
		}
	}
	return false
}
