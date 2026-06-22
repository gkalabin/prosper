package suggest

import (
	"context"
	"slices"
	"strings"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger/common"
	"prosper/ledger/snapshot"
	"prosper/userdb"
)

// Pipeline is the transaction draft pipeline. Suggest proposes drafts
// for the events its sources report; Complete fills the unset fields
// of a draft the user is editing.
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
	var drafts []*prosperv1.TransactionDraft
	for _, src := range p.sources {
		proposed, err := src.Propose(ctx, userID)
		if err != nil {
			return nil, err
		}
		drafts = append(drafts, proposed...)
	}
	if len(drafts) == 0 {
		return nil, nil
	}
	snap, err := snapshot.Load(ctx, p.db, userID)
	if err != nil {
		return nil, err
	}
	recallFromSnapshot(snap, drafts)
	for _, e := range p.enrichers {
		if err := e.Enrich(snap, drafts); err != nil {
			return nil, err
		}
	}
	sortDrafts(drafts)
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
		if c := strings.Compare(ka.key, kb.key); c != 0 {
			return c
		}
		return strings.Compare(string(ka.kind), string(kb.kind))
	})
}

// firstOriginKey is the key of the draft's first origin, or the zero
// value when the draft has none.
func firstOriginKey(d *prosperv1.TransactionDraft) OriginKey {
	if len(d.Origins) == 0 {
		return OriginKey{}
	}
	o := d.Origins[0]
	kind, _ := common.OriginKindToModel(o.Kind)
	return OriginKey{kind: kind, key: o.Key}
}
