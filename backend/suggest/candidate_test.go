package suggest

import (
	"testing"

	prosperv1 "prosper/gen/prosper/v1"
)

func TestTop(t *testing.T) {
	if _, ok := top([]*prosperv1.IdCandidate{}); ok {
		t.Error("top() of empty field reported ok")
	}
	field := []*prosperv1.IdCandidate{
		{Value: 1, Confidence: 80},
		{Value: 2, Confidence: 100},
	}
	got, ok := top(field)
	if !ok || got.Value != 2 {
		t.Errorf("top() = %v, %v; want 2, true", got.GetValue(), ok)
	}
}

func TestTopKeepsEarliestOnTie(t *testing.T) {
	field := []*prosperv1.StringCandidate{
		{Value: "first", Confidence: 100},
		{Value: "second", Confidence: 100},
	}
	got, ok := top(field)
	if !ok || got.Value != "first" {
		t.Errorf("top() = %v, %v; want first, true", got.GetValue(), ok)
	}
}
