package suggest

import (
	"slices"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger/snapshot"
)

// proposeExpenseTags proposes the tags the user usually attaches to
// expenses recorded under the draft's vendor.
func (h *history) proposeExpenseTags(d *prosperv1.TransactionDraft) {
	vendor, _ := top(d.Vendor)
	h.proposeTags(d, prosperv1.FormType_FORM_TYPE_EXPENSE, vendor.GetValue())
}

// proposeIncomeTags proposes the tags the user usually attaches to
// incomes recorded under the draft's payer.
func (h *history) proposeIncomeTags(d *prosperv1.TransactionDraft) {
	payer, _ := top(d.Payer)
	h.proposeTags(d, prosperv1.FormType_FORM_TYPE_INCOME, payer.GetValue())
}

func (h *history) proposeTags(d *prosperv1.TransactionDraft, form prosperv1.FormType, name string) {
	name = normalizeName(name)
	if name == "" {
		return
	}
	if names := h.rankedTags[historyScope{form: form, name: name}]; len(names) > 0 {
		addTags(&d.Tags, names, confidenceLearned)
	}
}

// rankedTagsByScope precomputes, per (form, name), the tags the user
// attaches to a majority of the transactions recorded under that name.
func rankedTagsByScope(snap *snapshot.Ledger) map[historyScope][]string {
	type tally struct {
		transactions int
		tagCounts    map[string]int
	}
	tallies := make(map[historyScope]*tally)
	for i := range snap.Transactions {
		t := &snap.Transactions[i]
		form, name, ok := formAndName(t)
		if !ok || name == "" {
			continue
		}
		scope := historyScope{form: form, name: name}
		ta := tallies[scope]
		if ta == nil {
			ta = &tally{tagCounts: make(map[string]int)}
			tallies[scope] = ta
		}
		ta.transactions++
		for _, tag := range snap.TagNamesByTransaction[t.ID] {
			ta.tagCounts[tag]++
		}
	}
	ranked := make(map[historyScope][]string, len(tallies))
	for scope, ta := range tallies {
		var frequent []string
		for tag, count := range ta.tagCounts {
			// Tags applied to only a minority are dropped so an occasional tag
			// doesn't become a standing suggestion.
			if count*2 > ta.transactions {
				frequent = append(frequent, tag)
			}
		}
		if len(frequent) == 0 {
			continue
		}
		slices.Sort(frequent)
		ranked[scope] = frequent
	}
	return ranked
}
