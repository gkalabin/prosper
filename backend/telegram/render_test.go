package telegram

import (
	"strings"
	"testing"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	prosperv1 "prosper/gen/prosper/v1"
)

// Confidence tiers, mirroring the suggest package.
const (
	observed = 100
	learned  = 80
	weak     = 50
)

var renderTime = time.Date(2026, 7, 7, 14, 32, 0, 0, time.UTC)

func testLookups() lookups {
	return lookups{
		accounts: map[int32]accountInfo{
			7: {name: "Current", bankName: "Monzo", currencyCode: "GBP"},
			8: {name: "Savings", bankName: "Monzo", currencyCode: "GBP"},
			9: {name: "EUR", bankName: "N26", currencyCode: "EUR"},
		},
		categories: map[int32]string{
			3: "Food > Groceries",
		},
	}
}

func money(v int64, conf int32) *prosperv1.MoneyCandidate {
	return &prosperv1.MoneyCandidate{Confidence: conf, ValueNanos: v}
}

func str(v string, conf int32) *prosperv1.StringCandidate {
	return &prosperv1.StringCandidate{Confidence: conf, Value: v}
}

func id(v int32) *prosperv1.IdCandidate {
	return &prosperv1.IdCandidate{Confidence: observed, Value: v}
}

func form(ft prosperv1.FormType) *prosperv1.FormTypeCandidate {
	return &prosperv1.FormTypeCandidate{Confidence: observed, Value: ft}
}

func ts() *prosperv1.TimestampCandidate {
	return &prosperv1.TimestampCandidate{Confidence: observed, Value: timestamppb.New(renderTime)}
}

func completeExpense() *prosperv1.TransactionDraft {
	return &prosperv1.TransactionDraft{
		Origins:       []*prosperv1.OriginKey{{Kind: prosperv1.OriginKind_ORIGIN_KIND_OPEN_BANKING, Key: "ob-1"}},
		FormType:      []*prosperv1.FormTypeCandidate{form(prosperv1.FormType_FORM_TYPE_EXPENSE)},
		Timestamp:     []*prosperv1.TimestampCandidate{ts()},
		Amount:        []*prosperv1.MoneyCandidate{money(24_990_000_000, observed)},
		AccountFromId: []*prosperv1.IdCandidate{id(7)},
		CategoryId:    []*prosperv1.IdCandidate{{Confidence: learned, Value: 3}},
		Vendor:        []*prosperv1.StringCandidate{str("AMAZON.CO.UK*A12BC", weak), str("Amazon", learned)},
	}
}

func TestRenderExpense(t *testing.T) {
	got := renderDraft(completeExpense(), testLookups())
	want := "🧾 New expense · £24.99\n" +
		"Amazon\n" +
		"Food > Groceries\n" +
		"Monzo: Current\n" +
		"7 Jul, 14:32\n" +
		"Bank text: AMAZON.CO.UK*A12BC"
	if got != want {
		t.Errorf("renderDraft:\n got %q\nwant %q", got, want)
	}
}

func TestRenderExpenseNoCategoryOmitsCategoryAndAddsHint(t *testing.T) {
	d := completeExpense()
	d.CategoryId = nil
	got := renderDraft(d, testLookups())
	if strings.Contains(got, "Groceries") {
		t.Errorf("category should be omitted without a winner:\n%s", got)
	}
	if !strings.HasSuffix(got, msgNoCategoryHint) {
		t.Errorf("expected the no-category hint at the end:\n%s", got)
	}
	if strings.Contains(got, "£24.99 · ·") {
		t.Errorf("amount line should not leave an empty category segment:\n%s", got)
	}
}

func TestRenderBankTextOmittedWhenSameAsName(t *testing.T) {
	d := completeExpense()
	// No learned name: the raw description is also the shown name.
	d.Vendor = []*prosperv1.StringCandidate{str("AMAZON", weak)}
	got := renderDraft(d, testLookups())
	if strings.Contains(got, "Bank text:") {
		t.Errorf("bank text line should be omitted when identical to the name:\n%s", got)
	}
	if !strings.Contains(got, "\nAMAZON\n") {
		t.Errorf("name line should show the raw name:\n%s", got)
	}
}

func TestRenderBankTextOmittedWhenOnlyCaseDiffers(t *testing.T) {
	d := completeExpense()
	// The learned name differs from the raw source only by letter case.
	d.Vendor = []*prosperv1.StringCandidate{str("amazon", weak), str("Amazon", learned)}
	got := renderDraft(d, testLookups())
	if strings.Contains(got, "Bank text:") {
		t.Errorf("bank text line should be omitted when it differs only by case:\n%s", got)
	}
}

func TestRenderExpenseSharedLine(t *testing.T) {
	d := completeExpense()
	d.SharingType = []*prosperv1.SharingTypeCandidate{{Confidence: learned, Value: prosperv1.SharingType_SHARING_TYPE_PAID_SELF_SHARED}}
	d.Companion = []*prosperv1.StringCandidate{str("Jane", learned)}
	d.OwnShareAmount = []*prosperv1.MoneyCandidate{money(12_500_000_000, learned)}
	got := renderDraft(d, testLookups())
	if !strings.Contains(got, "Shared with Jane · your share £12.50") {
		t.Errorf("expected sharing line:\n%s", got)
	}
}

func TestRenderExpenseTagsLine(t *testing.T) {
	d := completeExpense()
	d.Tags = []*prosperv1.TagsCandidate{{Confidence: learned, Value: &prosperv1.TagNames{Names: []string{"groceries", "weekly"}}}}
	got := renderDraft(d, testLookups())
	if !strings.Contains(got, "#groceries #weekly") {
		t.Errorf("expected tags line:\n%s", got)
	}
}

func TestRenderTransferSameCurrencyShowsAmountOnceInHeader(t *testing.T) {
	d := &prosperv1.TransactionDraft{
		FormType:       []*prosperv1.FormTypeCandidate{form(prosperv1.FormType_FORM_TYPE_TRANSFER)},
		Timestamp:      []*prosperv1.TimestampCandidate{ts()},
		Amount:         []*prosperv1.MoneyCandidate{money(100_000_000_000, observed)},
		AmountReceived: []*prosperv1.MoneyCandidate{money(100_000_000_000, observed)},
		AccountFromId:  []*prosperv1.IdCandidate{id(7)},
		AccountToId:    []*prosperv1.IdCandidate{id(8)},
		Description:    []*prosperv1.StringCandidate{str("TRANSFER REF 9", weak)},
	}
	got := renderDraft(d, testLookups())
	want := "🔁 New transfer · £100.00\n" +
		"Monzo: Current → Monzo: Savings\n" +
		"7 Jul, 14:32\n" +
		"Bank text: TRANSFER REF 9"
	if got != want {
		t.Errorf("renderDraft:\n got %q\nwant %q", got, want)
	}
}

func TestRenderTransferConversionShowsAmountPerLeg(t *testing.T) {
	d := &prosperv1.TransactionDraft{
		FormType:       []*prosperv1.FormTypeCandidate{form(prosperv1.FormType_FORM_TYPE_TRANSFER)},
		Timestamp:      []*prosperv1.TimestampCandidate{ts()},
		Amount:         []*prosperv1.MoneyCandidate{money(100_000_000_000, observed)},
		AmountReceived: []*prosperv1.MoneyCandidate{money(117_000_000_000, observed)},
		AccountFromId:  []*prosperv1.IdCandidate{id(7)},
		AccountToId:    []*prosperv1.IdCandidate{id(9)},
	}
	got := renderDraft(d, testLookups())
	want := "🔁 New transfer\n" +
		"£100.00 Monzo: Current → €117.00 N26: EUR\n" +
		"7 Jul, 14:32"
	if got != want {
		t.Errorf("renderDraft:\n got %q\nwant %q", got, want)
	}
}

func TestKeyboardOffersAddOnlyWhenComplete(t *testing.T) {
	complete := keyboard(1, completeExpense(), "")
	if !hasButton(complete, "✅ Add") {
		t.Error("a complete draft should offer Add")
	}
	incomplete := completeExpense()
	incomplete.CategoryId = nil
	if hasButton(keyboard(1, incomplete, ""), "✅ Add") {
		t.Error("an incomplete draft (no category) must not offer Add")
	}
}

func TestKeyboardEditButtonOnlyWithPublicURL(t *testing.T) {
	if hasButton(keyboard(1, completeExpense(), ""), "✏️ Edit in app") {
		t.Error("Edit in app should be absent without a public URL")
	}
	kb := keyboard(1, completeExpense(), "https://app.example")
	if !hasButton(kb, "✏️ Edit in app") {
		t.Error("Edit in app should be present with a public URL")
	}
}

func TestAddedSummary(t *testing.T) {
	got := addedSummary(completeExpense(), testLookups())
	if got != "✅ Added as Amazon · £24.99" {
		t.Errorf("addedSummary = %q", got)
	}
}

func hasButton(kb *InlineKeyboard, text string) bool {
	for _, row := range kb.InlineKeyboard {
		for _, b := range row {
			if b.Text == text {
				return true
			}
		}
	}
	return false
}
