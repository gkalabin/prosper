package suggest

import (
	"slices"
	"testing"

	"prosper/model"
)

func TestTopCategoriesRanksByFrequency(t *testing.T) {
	f := newFixture()
	f.addExpense(10, day(-5), "Cafe", 7, ledgerAccountChecking, 100)
	f.addExpense(11, day(-5), "Cafe", 7, ledgerAccountChecking, 100)
	f.addExpense(12, day(-5), "Cafe", 7, ledgerAccountChecking, 100)
	f.addExpense(13, day(-5), "Rent", 9, ledgerAccountChecking, 100)
	f.addExpense(14, day(-5), "Rent", 9, ledgerAccountChecking, 100)
	h := newHistory(f.snapshot(), dayZero)

	got := h.topCategoriesMatchMost([]transactionFilter{isExpense}, 5)
	if want := []int32{7, 9}; !slices.Equal(got, want) {
		t.Errorf("categories = %v, want %v ordered by descending frequency", got, want)
	}
}

func TestTopCategoriesSkipsUncategorized(t *testing.T) {
	f := newFixture()
	f.addExpense(10, day(-5), "Cafe", 7, ledgerAccountChecking, 100)
	// An expense recorded without a category contributes nothing.
	f.txs = append(f.txs, model.Transaction{ID: 11, Timestamp: day(-5), Type: model.TransactionExpense})
	h := newHistory(f.snapshot(), dayZero)

	got := h.topCategoriesMatchMost([]transactionFilter{isExpense}, 5)
	if want := []int32{7}; !slices.Equal(got, want) {
		t.Errorf("categories = %v, want %v with the uncategorized expense ignored", got, want)
	}
}

func TestTopCategoriesRelaxesFiltersFromTheRight(t *testing.T) {
	f := newFixture()
	// The vendor was recorded once under 7; unrelated expenses use 9 twice.
	f.addExpense(10, day(-5), "Starbucks", 7, ledgerAccountChecking, 100)
	f.addExpense(11, day(-5), "Rent", 9, ledgerAccountChecking, 100)
	f.addExpense(12, day(-5), "Rent", 9, ledgerAccountChecking, 100)
	h := newHistory(f.snapshot(), dayZero)

	got := h.topCategoriesMatchMost([]transactionFilter{isExpense, matchesVendor("Starbucks")}, 2)
	// The vendor-specific 7 ranks ahead of the globally more frequent 9
	// pulled in only after the vendor filter is relaxed.
	if want := []int32{7, 9}; !slices.Equal(got, want) {
		t.Errorf("categories = %v, want %v with the vendor match ranked first", got, want)
	}
}

func TestTopCategoriesStopsOnceWantSatisfied(t *testing.T) {
	f := newFixture()
	f.addExpense(10, day(-5), "Starbucks", 7, ledgerAccountChecking, 100)
	f.addExpense(11, day(-5), "Starbucks", 8, ledgerAccountChecking, 100)
	f.addExpense(12, day(-5), "Rent", 9, ledgerAccountChecking, 100)
	h := newHistory(f.snapshot(), dayZero)

	got := h.topCategoriesMatchMost([]transactionFilter{isExpense, matchesVendor("Starbucks")}, 2)
	// Both wanted categories come from the vendor match, so the filter is
	// never relaxed to surface the unrelated 9.
	if want := []int32{7, 8}; !slices.Equal(got, want) {
		t.Errorf("categories = %v, want %v without relaxing to the unrelated category", got, want)
	}
}

func TestTopCategoriesTruncatesToWant(t *testing.T) {
	f := newFixture()
	f.addExpense(10, day(-5), "Cafe", 7, ledgerAccountChecking, 100)
	f.addExpense(11, day(-5), "Rent", 9, ledgerAccountChecking, 100)
	h := newHistory(f.snapshot(), dayZero)

	got := h.topCategoriesMatchMost([]transactionFilter{isExpense}, 1)
	// A single pass collects both categories; the result is capped at want.
	if want := []int32{7}; !slices.Equal(got, want) {
		t.Errorf("categories = %v, want %v truncated to want", got, want)
	}
}

func TestTopCategoriesReturnsAllWhenWantExceedsAvailable(t *testing.T) {
	f := newFixture()
	f.addExpense(10, day(-5), "Cafe", 7, ledgerAccountChecking, 100)
	f.addExpense(11, day(-5), "Cafe", 7, ledgerAccountChecking, 100)
	f.addExpense(12, day(-5), "Rent", 9, ledgerAccountChecking, 100)
	h := newHistory(f.snapshot(), dayZero)

	got := h.topCategoriesMatchMost([]transactionFilter{isExpense}, 10)
	if want := []int32{7, 9}; !slices.Equal(got, want) {
		t.Errorf("categories = %v, want %v with every distinct category", got, want)
	}
}

func TestTopCategoriesKeepsFirstFilter(t *testing.T) {
	f := newFixture()
	f.addExpense(10, day(-5), "Cafe", 7, ledgerAccountChecking, 100)
	f.addIncome(11, day(-5), "ACME", 3, ledgerAccountChecking, 100)
	h := newHistory(f.snapshot(), dayZero)

	got := h.topCategoriesMatchMost([]transactionFilter{isIncome, matchesPayer("Nobody")}, 5)
	// Relaxation stops at the first filter, so the expense category never
	// leaks into an income proposal.
	if want := []int32{3}; !slices.Equal(got, want) {
		t.Errorf("categories = %v, want %v with the income filter retained", got, want)
	}
}

func TestTopCategoriesNoFiltersReturnsNothing(t *testing.T) {
	f := newFixture()
	f.addExpense(10, day(-5), "Cafe", 7, ledgerAccountChecking, 100)
	h := newHistory(f.snapshot(), dayZero)

	if got := h.topCategoriesMatchMost(nil, 5); len(got) != 0 {
		t.Errorf("categories = %v, want none without any filter", got)
	}
}
