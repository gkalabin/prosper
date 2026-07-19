package telegram

import (
	"testing"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger/common"
	"prosper/model"
)

func TestParseCallback(t *testing.T) {
	tests := []struct {
		data       string
		wantAction string
		wantID     int32
		wantOK     bool
	}{
		{"add:42", actionAdd, 42, true},
		{"ignore:7", actionIgnore, 7, true},
		{"add", "", 0, false},
		{"add:notanumber", "", 0, false},
		{"", "", 0, false},
	}
	for _, tc := range tests {
		action, id, ok := parseCallback(tc.data)
		if ok != tc.wantOK || action != tc.wantAction || id != tc.wantID {
			t.Errorf("parseCallback(%q) = (%q, %d, %v), want (%q, %d, %v)",
				tc.data, action, id, ok, tc.wantAction, tc.wantID, tc.wantOK)
		}
	}
}

func TestStartToken(t *testing.T) {
	tests := map[string]string{
		"/start abc123": "abc123",
		"/start":        "",
		"/start   ":     "",
		"hello":         "",
	}
	for text, want := range tests {
		if got := startToken(text); got != want {
			t.Errorf("startToken(%q) = %q, want %q", text, got, want)
		}
	}
}

func TestFindDraftByOrigins(t *testing.T) {
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

	// A transfer's second leg is enough to match.
	if got := findDraftByOrigins(drafts, []common.OriginKey{{Kind: model.OriginOpenBanking, Key: "b2"}}); got != draftB {
		t.Errorf("expected draftB by its second origin, got %v", got)
	}
	if got := findDraftByOrigins(drafts, []common.OriginKey{{Kind: model.OriginOpenBanking, Key: "a"}}); got != draftA {
		t.Errorf("expected draftA, got %v", got)
	}
	if got := findDraftByOrigins(drafts, []common.OriginKey{{Kind: model.OriginOpenBanking, Key: "missing"}}); got != nil {
		t.Errorf("expected no match, got %v", got)
	}
}
