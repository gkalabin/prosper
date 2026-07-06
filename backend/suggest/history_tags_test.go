package suggest

import (
	"slices"
	"testing"

	prosperv1 "prosper/gen/prosper/v1"
)

// draftTags returns the tag names the enriched draft proposes.
func draftTags(d *prosperv1.TransactionDraft) []string {
	c, ok := top(d.Tags)
	if !ok {
		return nil
	}
	return c.GetValue().GetNames()
}

func TestHistoryProposesTagsHabitualForTheVendor(t *testing.T) {
	f := newFixture()
	f.addExpense(10, day(-5), "Tesco", 7, ledgerAccountChecking, 100)
	f.addExpense(11, day(-4), "Tesco", 7, ledgerAccountChecking, 100)
	f.tag(10, "groceries")
	f.tag(11, "groceries")

	d := enrichedDraft(f, f.openBankingExpenseDraft("x", "Tesco", bankAccountChecking, 100))
	if got := draftTags(d); !slices.Equal(got, []string{"groceries"}) {
		t.Errorf("tags = %v, want [groceries] habitual for the vendor", got)
	}
}

func TestHistoryProposesEveryMajorityTagSorted(t *testing.T) {
	f := newFixture()
	f.addExpense(10, day(-5), "Amazon", 7, ledgerAccountChecking, 100)
	f.addExpense(11, day(-4), "Amazon", 7, ledgerAccountChecking, 100)
	f.tag(10, "shopping", "online")
	f.tag(11, "shopping", "online")

	d := enrichedDraft(f, f.openBankingExpenseDraft("x", "Amazon", bankAccountChecking, 100))
	if got := draftTags(d); !slices.Equal(got, []string{"online", "shopping"}) {
		t.Errorf("tags = %v, want both majority tags in sorted order", got)
	}
}

func TestHistoryOmitsMinorityTags(t *testing.T) {
	f := newFixture()
	f.addExpense(10, day(-5), "Tesco", 7, ledgerAccountChecking, 100)
	f.addExpense(11, day(-4), "Tesco", 7, ledgerAccountChecking, 100)
	f.addExpense(12, day(-3), "Tesco", 7, ledgerAccountChecking, 100)
	// Tagged on one of three Tesco expenses: not a habit.
	f.tag(10, "treat")

	d := enrichedDraft(f, f.openBankingExpenseDraft("x", "Tesco", bankAccountChecking, 100))
	if got := draftTags(d); got != nil {
		t.Errorf("tags = %v, want none for a minority tag", got)
	}
}

func TestHistoryDoesNotLeakTagsAcrossVendors(t *testing.T) {
	f := newFixture()
	f.addExpense(10, day(-5), "Tesco", 7, ledgerAccountChecking, 100)
	f.addExpense(11, day(-4), "Amazon", 7, ledgerAccountChecking, 100)
	f.tag(10, "groceries")
	f.tag(11, "shopping")

	d := enrichedDraft(f, f.openBankingExpenseDraft("x", "Tesco", bankAccountChecking, 100))
	if got := draftTags(d); !slices.Equal(got, []string{"groceries"}) {
		t.Errorf("tags = %v, want only the Tesco tag", got)
	}
}

func TestHistoryProposesNoTagsForUnknownVendor(t *testing.T) {
	f := newFixture()
	f.addExpense(10, day(-5), "Tesco", 7, ledgerAccountChecking, 100)
	f.addExpense(11, day(-4), "Tesco", 7, ledgerAccountChecking, 100)
	f.tag(10, "groceries")
	f.tag(11, "groceries")

	// Tags describe a specific vendor, so an unknown vendor gets none:
	// there is no form-wide fallback the way categories have.
	d := enrichedDraft(f, f.openBankingExpenseDraft("x", "Never Seen", bankAccountChecking, 100))
	if got := draftTags(d); got != nil {
		t.Errorf("tags = %v, want none for an unrecognized vendor", got)
	}
}

func TestHistoryProposesTagsHabitualForThePayer(t *testing.T) {
	f := newFixture()
	f.addIncome(10, day(-5), "ACME", 3, ledgerAccountChecking, 100)
	f.addIncome(11, day(-4), "ACME", 3, ledgerAccountChecking, 100)
	f.tag(10, "salary")
	f.tag(11, "salary")

	d := &prosperv1.TransactionDraft{}
	addFormType(&d.FormType, prosperv1.FormType_FORM_TYPE_INCOME, confidenceObserved)
	addString(&d.Payer, "ACME", confidenceWeak)
	enrichedDraft(f, d)
	if got := draftTags(d); !slices.Equal(got, []string{"salary"}) {
		t.Errorf("tags = %v, want [salary] habitual for the payer", got)
	}
}

func TestHistoryMatchesTagVendorIgnoringCaseAndSpaces(t *testing.T) {
	f := newFixture()
	f.addExpense(10, day(-5), " Tesco ", 7, ledgerAccountChecking, 100)
	f.addExpense(11, day(-4), " Tesco ", 7, ledgerAccountChecking, 100)
	f.tag(10, "groceries")
	f.tag(11, "groceries")

	d := enrichedDraft(f, f.openBankingExpenseDraft("x", "tesco", bankAccountChecking, 100))
	if got := draftTags(d); !slices.Equal(got, []string{"groceries"}) {
		t.Errorf("tags = %v, want [groceries] matched despite case and spacing", got)
	}
}

func TestHistoryConditionsTagsOnLearnedVendorName(t *testing.T) {
	f := newFixture()
	f.addExpense(10, day(-5), "Tesco", 7, ledgerAccountChecking, 100)
	f.addExpense(11, day(-4), "Tesco", 7, ledgerAccountChecking, 100)
	f.tag(10, "groceries")
	f.tag(11, "groceries")
	f.addOpenBankingOrigin("a", "TESCO STORES 1234", 10)
	f.addOpenBankingOrigin("b", "TESCO STORES 1234", 11)

	// The raw string is learned as "Tesco"; tags condition on that name.
	d := enrichedDraft(f, f.openBankingExpenseDraft("x", "TESCO STORES 1234", bankAccountChecking, 100))
	if got := draftTags(d); !slices.Equal(got, []string{"groceries"}) {
		t.Errorf("tags = %v, want [groceries] conditioned on the learned vendor", got)
	}
}
