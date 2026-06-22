package suggest

import (
	"context"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger/snapshot"
)

// OriginOpenBanking marks a draft origin as a fetched bank transaction;
// the origin key is the bank's transaction id.
// TODO: delete. use prosperv1.OriginKind_ORIGIN_KIND_OPEN_BANKING instead.
const OriginOpenBanking = prosperv1.OriginKind_ORIGIN_KIND_OPEN_BANKING

// Source proposes a draft for each event it knows about.
type Source interface {
	Propose(ctx context.Context, userID int32) ([]*prosperv1.TransactionDraft, error)
}

// Enricher appends candidates to the drafts' fields in place; existing
// candidates are never removed or replaced. Batched: one call per
// request over a shared ledger snapshot, so an enricher can do its
// per-user work once for all drafts.
type Enricher interface {
	Enrich(snap *snapshot.Ledger, drafts []*prosperv1.TransactionDraft) error
}
