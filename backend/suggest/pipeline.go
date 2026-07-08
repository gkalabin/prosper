package suggest

import (
	"context"
	"log"
	"slices"
	"strings"
	"time"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger/common"
	"prosper/ledger/snapshot"
	"prosper/userdb"
)

// Pipeline is the transaction draft pipeline. Suggest proposes drafts
// for the events its sources report.
type Pipeline struct {
	db        *userdb.DB
	sources   []Source
	enrichers []Enricher
}

// NewPipeline wires the production pipeline.
func NewPipeline(db *userdb.DB, openBanking OpenBankingStore) *Pipeline {
	return &Pipeline{
		db:        db,
		sources:   []Source{NewOpenBankingSource(openBanking)},
		enrichers: []Enricher{NewHistoryEnricher()},
	}
}

// Suggest proposes one draft per event the sources know about: collect
// the sources' proposals, recall what is already recorded from each
// event and enrich. The user's ledger snapshot is loaded once and
// shared by recall and every enricher.
func (p *Pipeline) Suggest(ctx context.Context, userID int32) ([]*prosperv1.TransactionDraft, error) {
	// Collect all drafts from all sources, e.g. open banking.
	proposeStart := time.Now()
	var drafts []*prosperv1.TransactionDraft
	for _, src := range p.sources {
		proposed, err := src.Propose(ctx, userID)
		if err != nil {
			return nil, err
		}
		drafts = append(drafts, proposed...)
	}
	proposeDuration := time.Since(proposeStart)
	if len(drafts) == 0 {
		return nil, nil
	}
	// Load the user's ledger. Used by the later parts of the pipeline.
	snapshotStart := time.Now()
	snap, err := snapshot.Load(ctx, p.db, userID)
	if err != nil {
		return nil, err
	}
	snapshotDuration := time.Since(snapshotStart)
	// Enrich the drafts with helpful suggestions, like using the same vendor name as the user usually records.
	// For example, open banking transactions reported as "AMAZON.CO.UK" get suggestion as "Amazon" based on the user's history.
	enrichStart := time.Now()
	recallFromSnapshot(snap, drafts)
	for _, e := range p.enrichers {
		if err := e.Enrich(snap, drafts); err != nil {
			return nil, err
		}
	}
	enrichDuration := time.Since(enrichStart)
	sortDrafts(drafts)
	log.Printf("suggest: user %d: %d drafts (propose=%s snapshot=%s enrich=%s total=%s)",
		userID, len(drafts), proposeDuration, snapshotDuration, enrichDuration, time.Since(proposeStart))
	return drafts, nil
}

// sortDrafts orders drafts newest first, with a stable tie-break on
// the first origin so the list doesn't shuffle between refreshes.
func sortDrafts(drafts []*prosperv1.TransactionDraft) {
	slices.SortStableFunc(drafts, func(a, b *prosperv1.TransactionDraft) int {
		at, aok := top(a.Timestamp)
		bt, bok := top(b.Timestamp)
		if aok != bok {
			// Drafts without a timestamp sink to the bottom.
			if aok {
				return -1
			}
			return 1
		}
		if aok {
			if c := bt.Value.AsTime().Compare(at.Value.AsTime()); c != 0 {
				return c
			}
		}
		ka, kb := firstOriginKey(a), firstOriginKey(b)
		if c := strings.Compare(ka.Key, kb.Key); c != 0 {
			return c
		}
		return strings.Compare(string(ka.Kind), string(kb.Kind))
	})
}

// firstOriginKey is the key of the draft's first origin, or the zero
// value when the draft has none.
func firstOriginKey(d *prosperv1.TransactionDraft) common.OriginKey {
	if len(d.Origins) == 0 {
		return common.OriginKey{}
	}
	o := d.Origins[0]
	kind, _ := common.OriginKindToModel(o.Kind)
	return common.OriginKey{Kind: kind, Key: o.Key}
}
