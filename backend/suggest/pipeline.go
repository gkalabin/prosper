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
)

// Pipeline is the transaction draft pipeline. Suggest proposes drafts
// for the events its sources report.
type Pipeline struct {
	sources   []Source
	enrichers []Enricher
}

// NewPipeline wires the production pipeline.
func NewPipeline(openBanking OpenBankingStore) *Pipeline {
	return &Pipeline{
		sources:   []Source{NewOpenBankingSource(openBanking)},
		enrichers: []Enricher{NewHistoryEnricher()},
	}
}

// Suggest proposes one draft per event the sources know about: collect
// the sources' proposals, recall what is already recorded from each
// event and enrich. The caller-owned ledger is shared by recall and
// every enricher.
func (p *Pipeline) Suggest(ctx context.Context, userID int32, snap *snapshot.Ledger) ([]*prosperv1.TransactionDraft, error) {
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
	log.Printf("suggest: user %d: %d drafts (propose=%s enrich=%s total=%s)",
		userID, len(drafts), proposeDuration, enrichDuration, time.Since(proposeStart))
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

// DraftByOrigins returns the draft that shares at least one origin.
func DraftByOrigins(drafts []*prosperv1.TransactionDraft, origins []common.OriginKey) *prosperv1.TransactionDraft {
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
