package suggest

import (
	"slices"
	"strings"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/model"
	"prosper/sliceutil"
)

// proposeExpenseCategories proposes the categories most frequently recorded for expenses like this draft.
func (h *history) proposeExpenseCategories(d *prosperv1.TransactionDraft) {
	filters := []transactionFilter{isExpense}
	vendor, _ := top(d.Vendor)
	if name := strings.TrimSpace(vendor.GetValue()); name != "" {
		filters = append(filters, matchesVendor(name))
	}
	filters = append(filters, h.isRecent)
	h.proposeCategories(d, filters)
}

// proposeIncomeCategories proposes the categories most frequently recorded for incomes like this draft.
func (h *history) proposeIncomeCategories(d *prosperv1.TransactionDraft) {
	filters := []transactionFilter{isIncome}
	payer, _ := top(d.Payer)
	if name := strings.TrimSpace(payer.GetValue()); name != "" {
		filters = append(filters, matchesPayer(name))
	}
	filters = append(filters, h.isRecent)
	h.proposeCategories(d, filters)
}

// proposeTransferCategories proposes the categories most frequently recorded for recent transfers.
func (h *history) proposeTransferCategories(d *prosperv1.TransactionDraft) {
	h.proposeCategories(d, []transactionFilter{isTransfer, h.isRecent})
}

// proposeCategories proposes the categories the transactions matching the filters most frequently use.
func (h *history) proposeCategories(d *prosperv1.TransactionDraft, filters []transactionFilter) {
	for _, categoryID := range h.topCategoriesMatchMost(filters, topCategoriesWant) {
		addID(&d.CategoryId, categoryID, confidenceLearned)
	}
}

// proposeRepaymentCategories proposes the categories the user records debt repayments under.
func (h *history) proposeRepaymentCategories(d *prosperv1.TransactionDraft) {
	var ids []int32
	for _, link := range h.snap.Links {
		if link.LinkType != model.LinkDebtSettling {
			continue
		}
		repayment, ok := h.snap.CurrentVersion(link.LinkedTransactionID)
		if !ok || repayment.CategoryID == nil {
			continue
		}
		ids = append(ids, *repayment.CategoryID)
	}
	categories := sliceutil.UniqMostFrequent(ids)
	if len(categories) > topCategoriesWant {
		categories = categories[:topCategoriesWant]
	}
	for _, id := range categories {
		addID(&d.RepaymentCategoryId, id, confidenceLearned)
	}
}

type transactionFilter func(t *model.Transaction) bool

// topCategoriesMatchMost ranks categories by how often the
// transactions matching all filters use them, relaxing the filters
// from the right until want categories are found or only the first
// filter remains.
func (h *history) topCategoriesMatchMost(filters []transactionFilter, want int) []int32 {
	var result []int32
	current := slices.Clone(filters)
	for len(result) < want && len(current) > 0 {
		ids := collect(h.snap, func(t *model.Transaction) (int32, bool) {
			if t.CategoryID == nil {
				return 0, false
			}
			for _, f := range current {
				if !f(t) {
					return 0, false
				}
			}
			return *t.CategoryID, true
		})
		for _, id := range sliceutil.UniqMostFrequent(ids) {
			if !slices.Contains(result, id) {
				result = append(result, id)
			}
		}
		current = current[:len(current)-1]
	}
	if len(result) > want {
		result = result[:want]
	}
	return result
}

func isExpense(t *model.Transaction) bool {
	return t.Type == model.TransactionExpense || t.Type == model.TransactionThirdPartyExpense
}

func isIncome(t *model.Transaction) bool {
	return t.Type == model.TransactionIncome
}

func isTransfer(t *model.Transaction) bool {
	return t.Type == model.TransactionTransfer
}

func (h *history) isRecent(t *model.Transaction) bool {
	return t.Timestamp.After(h.now.AddDate(0, -recentWindowMonths, 0))
}

// matchesVendor matches expenses recorded under the given vendor name, ignoring case and surrounding spaces.
func matchesVendor(vendor string) transactionFilter {
	vendor = strings.ToLower(strings.TrimSpace(vendor))
	return func(t *model.Transaction) bool {
		if t.Vendor == nil {
			return false
		}
		return vendor == strings.ToLower(strings.TrimSpace(*t.Vendor))
	}
}

// matchesPayer is matchesVendor for incomes and their payer.
func matchesPayer(payer string) transactionFilter {
	payer = strings.ToLower(strings.TrimSpace(payer))
	return func(t *model.Transaction) bool {
		if t.Payer == nil {
			return false
		}
		return payer == strings.ToLower(strings.TrimSpace(*t.Payer))
	}
}
