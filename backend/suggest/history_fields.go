package suggest

import (
	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger/snapshot"
	"prosper/model"
	"prosper/moneyutil"
	"prosper/sliceutil"
)

// proposeRecordedName proposes the name the draft's raw bank text was
// most frequently recorded under, into the given name field.
func (h *history) proposeRecordedName(d *prosperv1.TransactionDraft, field *[]*prosperv1.StringCandidate) {
	raw := h.snap.OpenBankingDescriptionByExternalID[firstOriginKey(d).key]
	if raw == "" {
		return
	}
	if name, ok := h.nameByRawDescription[raw]; ok {
		*field = append(*field, &prosperv1.StringCandidate{Confidence: confidenceLearned, Value: name})
	}
}

// proposeSharing proposes the sharing setup for drafts moving money
// through the given joint account: split with the usual companion, half
// the amount as the user's own share.
func (h *history) proposeSharing(d *prosperv1.TransactionDraft, account []*prosperv1.IdCandidate) {
	if h.mostFrequentCompanion != "" {
		d.Companion = append(d.Companion, &prosperv1.StringCandidate{Confidence: confidenceLearned, Value: h.mostFrequentCompanion})
	}
	accountID, ok := top(account)
	if !ok || !h.jointAccountIDs[accountID.Value] {
		return
	}
	d.SharingType = append(d.SharingType, &prosperv1.SharingTypeCandidate{Confidence: confidenceLearned, Value: prosperv1.SharingType_SHARING_TYPE_PAID_SELF_SHARED})
	if amount, ok := top(d.Amount); ok {
		ownShareNanos := moneyutil.RoundNanosToCent(amount.ValueNanos / 2)
		d.OwnShareAmount = append(d.OwnShareAmount, &prosperv1.MoneyCandidate{Confidence: confidenceLearned, ValueNanos: ownShareNanos})
	}
}

// findMostFrequentCompanion finds the companion the user most frequently splits
// transactions with. Returns an empty string when there are no shared splits.
func findMostFrequentCompanion(snap *snapshot.Ledger) string {
	companions := sliceutil.UniqMostFrequent(collect(snap, func(t *model.Transaction) (string, bool) {
		splits := snap.SplitsByTransaction[t.ID]
		if len(splits) == 0 || splits[0].CompanionName == "" {
			return "", false
		}
		return splits[0].CompanionName, true
	}))
	if len(companions) == 0 {
		return ""
	}
	return companions[0]
}

// proposeThirdPartyPayer proposes who usually pays for the user — the
// prefill for marking an expense as paid by someone else.
func (h *history) proposeThirdPartyPayer(d *prosperv1.TransactionDraft) {
	if h.mostFrequentThirdPartyPayer != "" {
		d.Payer = append(d.Payer, &prosperv1.StringCandidate{Confidence: confidenceLearned, Value: h.mostFrequentThirdPartyPayer})
	}
}

// findMostFrequentThirdPartyPayer finds the most frequent payer on the user's
// behalf. Returns an empty string when there are no third-party expenses.
func findMostFrequentThirdPartyPayer(snap *snapshot.Ledger) string {
	payers := sliceutil.UniqMostFrequent(collect(snap, func(t *model.Transaction) (string, bool) {
		if t.Type != model.TransactionThirdPartyExpense || t.Payer == nil || *t.Payer == "" {
			return "", false
		}
		return *t.Payer, true
	}))
	if len(payers) == 0 {
		return ""
	}
	return payers[0]
}
