package suggest

import (
	"slices"
	"strings"
	"time"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger/snapshot"
	"prosper/model"
	"prosper/sliceutil"
)

// proposeExpenseCategories proposes the categories most frequently recorded for expenses like this draft.
func (h *history) proposeExpenseCategories(d *prosperv1.TransactionDraft) {
	vendor, _ := top(d.Vendor)
	h.proposeCategories(d, prosperv1.FormType_FORM_TYPE_EXPENSE, vendor.GetValue())
}

// proposeIncomeCategories proposes the categories most frequently recorded for incomes like this draft.
func (h *history) proposeIncomeCategories(d *prosperv1.TransactionDraft) {
	payer, _ := top(d.Payer)
	h.proposeCategories(d, prosperv1.FormType_FORM_TYPE_INCOME, payer.GetValue())
}

// proposeTransferCategories proposes the categories most frequently recorded for recent transfers.
func (h *history) proposeTransferCategories(d *prosperv1.TransactionDraft) {
	h.proposeCategories(d, prosperv1.FormType_FORM_TYPE_TRANSFER, "")
}

// proposeCategories proposes the categories the user most frequently
// records for transactions like the draft: same form type, preferring
// those recently recorded under the same name.
func (h *history) proposeCategories(d *prosperv1.TransactionDraft, form prosperv1.FormType, name string) {
	for _, categoryID := range h.topCategories(form, name, topCategoriesWant) {
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

type categoryRankingScope struct {
	form   prosperv1.FormType
	name   string
	recent bool
}

// rankedCategoriesByScope precomputes every category ranking topCategories
// may consult, in one pass over the ledger.
func rankedCategoriesByScope(snap *snapshot.Ledger, now time.Time) map[categoryRankingScope][]int32 {
	recentCutoff := now.AddDate(0, -recentWindowMonths, 0)
	idsByScope := make(map[categoryRankingScope][]int32)
	for i := range snap.Transactions {
		t := &snap.Transactions[i]
		if t.CategoryID == nil {
			continue
		}
		var form prosperv1.FormType
		var name string
		switch {
		case isExpense(t):
			form = prosperv1.FormType_FORM_TYPE_EXPENSE
			if t.Vendor != nil {
				name = normalizeName(*t.Vendor)
			}
		case isIncome(t):
			form = prosperv1.FormType_FORM_TYPE_INCOME
			if t.Payer != nil {
				name = normalizeName(*t.Payer)
			}
		case isTransfer(t):
			form = prosperv1.FormType_FORM_TYPE_TRANSFER
		default:
			continue
		}
		recent := t.Timestamp.After(recentCutoff)
		scopes := []categoryRankingScope{{form: form}}
		if recent {
			scopes = append(scopes, categoryRankingScope{form: form, recent: true})
		}
		if name != "" {
			scopes = append(scopes, categoryRankingScope{form: form, name: name})
		}
		if name != "" && recent {
			scopes = append(scopes, categoryRankingScope{form: form, name: name, recent: true})
		}
		for _, scope := range scopes {
			idsByScope[scope] = append(idsByScope[scope], *t.CategoryID)
		}
	}
	ranked := make(map[categoryRankingScope][]int32, len(idsByScope))
	for scope, ids := range idsByScope {
		ranked[scope] = sliceutil.UniqMostFrequent(ids)
	}
	return ranked
}

// topCategories returns up to want category ids for the form type, most
// frequently used first. Transactions recorded under the given name
// (matched ignoring case and surrounding spaces) rank ahead of the rest,
// recent ones ahead of older ones: the narrowest ranking is consulted
// first and relaxed until want categories are found.
func (h *history) topCategories(form prosperv1.FormType, name string, want int) []int32 {
	var scopes []categoryRankingScope
	if name = normalizeName(name); name != "" {
		scopes = []categoryRankingScope{
			{form: form, name: name, recent: true},
			{form: form, name: name},
			{form: form},
		}
	} else {
		scopes = []categoryRankingScope{
			{form: form, recent: true},
			{form: form},
		}
	}
	var result []int32
	for _, scope := range scopes {
		for _, id := range h.rankedCategories[scope] {
			if !slices.Contains(result, id) {
				result = append(result, id)
			}
		}
		if len(result) >= want {
			break
		}
	}
	if len(result) > want {
		result = result[:want]
	}
	return result
}

// normalizeName canonicalizes a vendor/payer name for matching.
func normalizeName(name string) string {
	return strings.ToLower(strings.TrimSpace(name))
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
