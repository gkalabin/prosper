package suggest

import (
	"time"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger/snapshot"
	"prosper/model"
	"prosper/sliceutil"
)

// topCategoriesWant is how many category proposals the enricher emits:
// the winner prefills the form and the runner-ups render as the
// most-frequently-used picks of the category select.
const topCategoriesWant = 3

// recentWindowMonths bounds how far back the category frequencies
// look: older habits matter less than the last few months.
const recentWindowMonths = 3

// HistoryEnricher proposes field values learned from the user's past
// recordings: like the name each raw bank string was recorded under or
// category frequencies conditioned on the draft's vendor or payer.
type HistoryEnricher struct{}

func NewHistoryEnricher() *HistoryEnricher {
	return &HistoryEnricher{}
}

func (h *HistoryEnricher) Enrich(snap *snapshot.Ledger, drafts []*prosperv1.TransactionDraft) error {
	hist := newHistory(snap, time.Now())
	for _, d := range drafts {
		hist.enrich(d)
	}
	return nil
}

// history is the precomputed view of a user's recording habits the
// enricher proposes values from.
type history struct {
	snap *snapshot.Ledger
	now  time.Time
	// nameByRawDescription maps the description text of an imported
	// open-banking transaction to the name the user most frequently
	// recorded it under.
	nameByRawDescription map[string]string
	// jointAccountIDs marks the bank accounts shared with a companion.
	jointAccountIDs map[int32]bool
}

func newHistory(snap *snapshot.Ledger, now time.Time) *history {
	h := &history{
		snap:            snap,
		now:             now,
		jointAccountIDs: make(map[int32]bool),
	}
	for _, a := range snap.BankAccounts {
		if a.Joint {
			h.jointAccountIDs[a.ID] = true
		}
	}
	h.nameByRawDescription = recordedNamesByRawDescription(snap)
	return h
}

func (h *history) enrich(d *prosperv1.TransactionDraft) {
	formType := prosperv1.FormType_FORM_TYPE_EXPENSE
	if c, ok := top(d.FormType); ok {
		formType = c.Value
	}
	switch formType {
	case prosperv1.FormType_FORM_TYPE_EXPENSE:
		h.enrichExpense(d)
	case prosperv1.FormType_FORM_TYPE_INCOME:
		h.enrichIncome(d)
	case prosperv1.FormType_FORM_TYPE_TRANSFER:
		h.enrichTransfer(d)
	}
}

func (h *history) enrichExpense(d *prosperv1.TransactionDraft) {
	h.proposeRecordedName(d, &d.Vendor)
	h.proposeExpenseCategories(d)
	h.proposeSharing(d, d.AccountFromId)
	h.proposeThirdPartyPayer(d)
	h.proposeRepaymentCategories(d)
}

func (h *history) enrichIncome(d *prosperv1.TransactionDraft) {
	h.proposeRecordedName(d, &d.Payer)
	h.proposeIncomeCategories(d)
	h.proposeSharing(d, d.AccountToId)
}

func (h *history) enrichTransfer(d *prosperv1.TransactionDraft) {
	h.proposeRecordedName(d, &d.Description)
	h.proposeTransferCategories(d)
}

// recordedNamesByRawDescription learns which name the user records each
// raw bank string under: an expense's vendor, an income's payer,
// otherwise the note.
func recordedNamesByRawDescription(snap *snapshot.Ledger) map[string]string {
	usages := make(map[string][]string)
	for _, o := range snap.Origins {
		raw := snap.OpenBankingDescriptionByExternalID[o.Key]
		if raw == "" {
			continue
		}
		t, ok := snap.CurrentVersion(o.InternalTransactionID)
		if !ok {
			// This is not always data inconsistency: the linked transaction might have been deleted.
			continue
		}
		name := t.Note
		switch {
		case isIncome(t) && t.Payer != nil:
			name = *t.Payer
		case isExpense(t) && t.Vendor != nil:
			name = *t.Vendor
		}
		if name == "" || name == raw {
			continue
		}
		usages[raw] = append(usages[raw], name)
	}
	out := make(map[string]string, len(usages))
	for raw, names := range usages {
		out[raw] = sliceutil.UniqMostFrequent(names)[0]
	}
	return out
}

// collect applies pick to every transaction and returns the accepted values.
func collect[T any](snap *snapshot.Ledger, pick func(t *model.Transaction) (T, bool)) []T {
	var out []T
	for i := range snap.Transactions {
		if v, ok := pick(&snap.Transactions[i]); ok {
			out = append(out, v)
		}
	}
	return out
}
