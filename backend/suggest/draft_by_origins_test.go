package suggest

import (
	"testing"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger/common"
	"prosper/model"
)

func TestDraftByOrigins(t *testing.T) {
	draftA := &prosperv1.TransactionDraft{
		Origins: []*prosperv1.OriginKey{{Kind: prosperv1.OriginKind_ORIGIN_KIND_OPEN_BANKING, Key: "a"}},
	}
	draftB := &prosperv1.TransactionDraft{
		Origins: []*prosperv1.OriginKey{
			{Kind: prosperv1.OriginKind_ORIGIN_KIND_OPEN_BANKING, Key: "b1"},
			{Kind: prosperv1.OriginKind_ORIGIN_KIND_OPEN_BANKING, Key: "b2"},
		},
	}
	drafts := []*prosperv1.TransactionDraft{draftA, draftB}

	if got := DraftByOrigins(drafts, []common.OriginKey{{Kind: model.OriginOpenBanking, Key: "b1"}}); got != draftB {
		t.Errorf("expected draftB by its first origin, got %v", got)
	}
	if got := DraftByOrigins(drafts, []common.OriginKey{{Kind: model.OriginOpenBanking, Key: "b2"}}); got != draftB {
		t.Errorf("expected draftB by its second origin, got %v", got)
	}
	if got := DraftByOrigins(drafts, []common.OriginKey{{Kind: model.OriginOpenBanking, Key: "a"}}); got != draftA {
		t.Errorf("expected draftA, got %v", got)
	}
	if got := DraftByOrigins(drafts, []common.OriginKey{{Kind: model.OriginOpenBanking, Key: "missing"}}); got != nil {
		t.Errorf("expected no match, got %v", got)
	}
}
