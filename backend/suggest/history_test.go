package suggest

import (
	"testing"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger/snapshot"
)

// enrichedDraft runs the history enricher over a draft built from a fixture.
func enrichedDraft(f *fixture, d *prosperv1.TransactionDraft) *prosperv1.TransactionDraft {
	newHistory(f.snapshot(), dayZero).enrich(d)
	return d
}

// openBankingExpenseDraft is a draft as the open-banking source would
// emit it for a withdrawal. It registers the bank's raw description so
// the enricher's snapshot can recover it from the draft's origin, as it
// can in production where the draft's own transaction is stored.
func (f *fixture) openBankingExpenseDraft(externalID, rawDescription string, accountID int32, amountNanos int64) *prosperv1.TransactionDraft {
	f.descriptions = append(f.descriptions, snapshot.OpenBankingDescription{ExternalID: externalID, Description: rawDescription})
	d := &prosperv1.TransactionDraft{Origins: []*prosperv1.OriginKey{{Kind: OriginOpenBanking, Key: externalID}}}
	addFormType(&d.FormType, prosperv1.FormType_FORM_TYPE_EXPENSE, confidenceObserved)
	addTimestamp(&d.Timestamp, day(0), confidenceObserved)
	addMoney(&d.Amount, amountNanos, confidenceObserved)
	addID(&d.AccountFromId, accountID, confidenceObserved)
	addString(&d.Vendor, rawDescription, confidenceWeak)
	return d
}

func TestHistoryMapsRawDescriptionToRecordedVendor(t *testing.T) {
	f := newFixture()
	// "ZETTLE *STARBU" was recorded as Starbucks twice and once as Cafe.
	f.addExpense(10, day(-10), "Starbucks", 7, ledgerAccountChecking, 100)
	f.addExpense(11, day(-8), "Starbucks", 7, ledgerAccountChecking, 100)
	f.addExpense(12, day(-6), "Cafe", 7, ledgerAccountChecking, 100)
	f.addOpenBankingOrigin("a", "ZETTLE *STARBU", 10)
	f.addOpenBankingOrigin("b", "ZETTLE *STARBU", 11)
	f.addOpenBankingOrigin("c", "ZETTLE *STARBU", 12)

	d := enrichedDraft(f, f.openBankingExpenseDraft("x", "ZETTLE *STARBU", bankAccountChecking, 100))
	if c, _ := top(d.Vendor); c.GetValue() != "Starbucks" {
		t.Errorf("vendor = %q, want the learned Starbucks over the raw string", c.GetValue())
	}
}

func TestHistoryKeepsUnrecognizedRawString(t *testing.T) {
	f := newFixture()
	f.addExpense(10, day(-10), "Starbucks", 7, ledgerAccountChecking, 100)
	f.addOpenBankingOrigin("a", "ZETTLE *STARBU", 10)

	d := enrichedDraft(f, f.openBankingExpenseDraft("x", "NEVER SEEN", bankAccountChecking, 100))
	if c, _ := top(d.Vendor); c.GetValue() != "NEVER SEEN" {
		t.Errorf("vendor = %q, want the raw string to stand", c.GetValue())
	}
}

func TestHistoryConditionsCategoriesOnTheVendor(t *testing.T) {
	f := newFixture()
	f.addExpense(10, day(-10), "Starbucks", 7, ledgerAccountChecking, 100)
	f.addExpense(11, day(-9), "Starbucks", 7, ledgerAccountChecking, 100)
	f.addExpense(12, day(-8), "Rent", 9, ledgerAccountChecking, 100)
	f.addExpense(13, day(-7), "Rent", 9, ledgerAccountChecking, 100)
	f.addExpense(14, day(-6), "Rent", 9, ledgerAccountChecking, 100)

	d := enrichedDraft(f, f.openBankingExpenseDraft("x", "Starbucks", bankAccountChecking, 100))
	if c, _ := top(d.CategoryId); c.GetValue() != 7 {
		t.Errorf("category = %d, want the vendor's usual 7 over the overall most frequent", c.GetValue())
	}
}

func TestHistoryFallsBackToOverallFrequencyForUnknownVendor(t *testing.T) {
	f := newFixture()
	f.addExpense(10, day(-10), "Rent", 9, ledgerAccountChecking, 100)
	f.addExpense(11, day(-9), "Rent", 9, ledgerAccountChecking, 100)
	f.addExpense(12, day(-8), "Cafe", 7, ledgerAccountChecking, 100)

	d := enrichedDraft(f, f.openBankingExpenseDraft("x", "NEVER SEEN", bankAccountChecking, 100))
	if c, _ := top(d.CategoryId); c.GetValue() != 9 {
		t.Errorf("category = %d, want the overall most frequent 9", c.GetValue())
	}
}

func TestHistoryCategoryRelaxationIgnoresOldHabitsFirst(t *testing.T) {
	f := newFixture()
	// The vendor was recorded long ago under category 5; recent
	// unrelated expenses use category 9.
	f.addExpense(10, day(-200), "Starbucks", 5, ledgerAccountChecking, 100)
	f.addExpense(11, day(-1), "Rent", 9, ledgerAccountChecking, 100)

	d := enrichedDraft(f, f.openBankingExpenseDraft("x", "Starbucks", bankAccountChecking, 100))
	// Recency is relaxed before the vendor match, so the old vendor
	// category still ranks first.
	if c, _ := top(d.CategoryId); c.GetValue() != 5 {
		t.Errorf("category = %d, want the vendor's old category 5", c.GetValue())
	}
}

func TestHistoryProposesCategoriesForIncomeByPayer(t *testing.T) {
	f := newFixture()
	f.addIncome(10, day(-10), "ACME", 3, ledgerAccountChecking, 100)
	f.addIncome(11, day(-9), "ACME", 3, ledgerAccountChecking, 100)
	f.addIncome(12, day(-8), "Other", 4, ledgerAccountChecking, 100)

	d := &prosperv1.TransactionDraft{}
	addFormType(&d.FormType, prosperv1.FormType_FORM_TYPE_INCOME, confidenceObserved)
	addString(&d.Payer, "ACME", confidenceWeak)
	enrichedDraft(f, d)
	if c, _ := top(d.CategoryId); c.GetValue() != 3 {
		t.Errorf("income category = %d, want the payer's usual 3", c.GetValue())
	}
}

func TestHistoryProposesTransferCategory(t *testing.T) {
	f := newFixture()
	f.addTransfer(10, day(-10), 6, ledgerAccountChecking, ledgerAccountSavings, 100, 100)
	f.addExpense(11, day(-9), "Rent", 9, ledgerAccountChecking, 100)

	d := &prosperv1.TransactionDraft{}
	addFormType(&d.FormType, prosperv1.FormType_FORM_TYPE_TRANSFER, confidenceObserved)
	enrichedDraft(f, d)
	if c, _ := top(d.CategoryId); c.GetValue() != 6 {
		t.Errorf("transfer category = %d, want 6", c.GetValue())
	}
}

func TestHistoryProposesSharingForJointAccounts(t *testing.T) {
	f := newFixture()
	f.addSharedExpense(10, day(-10), "Groceries", 7, ledgerAccountJoint, 200, 100, "Bob")

	d := enrichedDraft(f, f.openBankingExpenseDraft("x", "TESCO", bankAccountJoint, 10_010_000_000))
	if c, _ := top(d.SharingType); c.GetValue() != prosperv1.SharingType_SHARING_TYPE_PAID_SELF_SHARED {
		t.Errorf("sharing type = %v, want PAID_SELF_SHARED for a joint account", c.GetValue())
	}
	if c, _ := top(d.Companion); c.GetValue() != "Bob" {
		t.Errorf("companion = %q, want the usual Bob", c.GetValue())
	}
	if c, _ := top(d.OwnShareAmount); c.GetValueNanos() != 5_010_000_000 {
		t.Errorf("own share = %d, want half the amount rounded to a cent", c.GetValueNanos())
	}
}

func TestHistoryDoesNotProposeSharingForSoloAccounts(t *testing.T) {
	f := newFixture()
	f.addSharedExpense(10, day(-10), "Groceries", 7, ledgerAccountJoint, 200, 100, "Bob")

	d := enrichedDraft(f, f.openBankingExpenseDraft("x", "TESCO", bankAccountChecking, 200))
	if len(d.SharingType) != 0 {
		t.Errorf("sharing proposed for a solo account: %v", d.SharingType)
	}
	// The companion is still proposed: it prefills turning on a split by hand.
	if c, _ := top(d.Companion); c.GetValue() != "Bob" {
		t.Errorf("companion = %q, want Bob", c.GetValue())
	}
}

func TestHistoryProposesThirdPartyPayerAndRepaymentCategories(t *testing.T) {
	f := newFixture()
	f.addThirdPartyExpense(10, day(-10), "Pizza", "Alice", 7, 30, 15)
	f.addExpense(11, day(-9), "Alice", 9, ledgerAccountChecking, 15)
	f.links = append(f.links, modelDebtLink(10, 11))

	d := enrichedDraft(f, f.openBankingExpenseDraft("x", "PIZZA", bankAccountChecking, 30))
	if c, _ := top(d.Payer); c.GetValue() != "Alice" {
		t.Errorf("payer = %q, want the usual third-party payer", c.GetValue())
	}
	if c, _ := top(d.RepaymentCategoryId); c.GetValue() != 9 {
		t.Errorf("repayment category = %d, want 9", c.GetValue())
	}
}
