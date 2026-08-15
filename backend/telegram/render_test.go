package telegram

import (
	"strings"
	"testing"
	"time"

	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger/snapshot"
	"prosper/model"
)

// Confidence tiers, mirroring the suggest package.
const (
	observed = 100
	learned  = 80
	weak     = 50
)

var renderTime = time.Date(2026, 7, 7, 14, 32, 0, 0, time.UTC)

func testLedger() *snapshot.Ledger {
	gbp, eur := "GBP", "EUR"
	return snapshot.New(
		nil, nil, nil, nil, nil, nil, nil,
		[]model.BankAccount{
			{ID: 7, Name: "Current", BankID: 1, CurrencyCode: &gbp},
			{ID: 8, Name: "Savings", BankID: 1, CurrencyCode: &gbp},
			{ID: 9, Name: "EUR", BankID: 2, CurrencyCode: &eur},
		},
		[]model.Bank{
			{ID: 1, Name: "Monzo"},
			{ID: 2, Name: "N26"},
		},
		[]model.Category{
			{ID: 2, Name: "Food"},
			{ID: 3, Name: "Groceries", ParentCategoryID: proto.Int32(2)},
		},
		nil, nil,
	)
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

func mustRender(t *testing.T, d *prosperv1.TransactionDraft, snap *snapshot.Ledger) model.TelegramMessage {
	t.Helper()
	msg, err := renderDraft(d, snap)
	if err != nil {
		t.Fatalf("renderDraft: %v", err)
	}
	return msg
}

func TestRenderExpense(t *testing.T) {
	got := mustRender(t, completeExpense(), testLedger())
	want := model.TelegramMessage{
		Kind:  model.TransactionExpense,
		Title: "<b>-£24.99</b> Amazon · <i>7 Jul, 14:32</i>",
		Body: "🗂️ Food › Groceries\n" +
			"🏦 Monzo: Current\n" +
			"\n" +
			"<i>Bank text: AMAZON.CO.UK*A12BC</i>",
	}
	if got != want {
		t.Errorf("renderDraft:\n got %+v\nwant %+v", got, want)
	}
	wantText := "<b>-£24.99</b> Amazon · <i>7 Jul, 14:32</i>\n" +
		"\n" +
		"🗂️ Food › Groceries\n" +
		"🏦 Monzo: Current\n" +
		"\n" +
		"<i>Bank text: AMAZON.CO.UK*A12BC</i>"
	if text := formatMessage(got); text != wantText {
		t.Errorf("formatMessage:\n got %q\nwant %q", text, wantText)
	}
}

func TestRenderIncome(t *testing.T) {
	d := completeExpense()
	d.FormType = []*prosperv1.FormTypeCandidate{form(prosperv1.FormType_FORM_TYPE_INCOME)}
	d.Vendor = nil
	d.Payer = []*prosperv1.StringCandidate{str("ACME PAYROLL", weak), str("Acme", learned)}
	d.AccountFromId, d.AccountToId = nil, []*prosperv1.IdCandidate{id(7)}
	got := mustRender(t, d, testLedger())
	want := model.TelegramMessage{
		Kind:  model.TransactionIncome,
		Title: "<b>+£24.99</b> Acme · <i>7 Jul, 14:32</i>",
		Body: "🗂️ Food › Groceries\n" +
			"🏦 Monzo: Current\n" +
			"\n" +
			"<i>Bank text: ACME PAYROLL</i>",
	}
	if got != want {
		t.Errorf("renderDraft:\n got %+v\nwant %+v", got, want)
	}
}

func TestRenderDraftWithoutFormTypeFails(t *testing.T) {
	d := completeExpense()
	d.FormType = nil
	if _, err := renderDraft(d, testLedger()); err == nil {
		t.Error("a draft without a form type should not render")
	}
}

func TestRenderEscapesMarkupInValues(t *testing.T) {
	d := completeExpense()
	d.Vendor = []*prosperv1.StringCandidate{str("M&S <b>", weak), str("M&S", learned)}
	got := formatMessage(mustRender(t, d, testLedger()))
	if !strings.Contains(got, "<b>-£24.99</b> M&amp;S ·") {
		t.Errorf("name should be escaped:\n%s", got)
	}
	if !strings.Contains(got, "<i>Bank text: M&amp;S &lt;b&gt;</i>") {
		t.Errorf("bank text should be escaped:\n%s", got)
	}
}

func TestRenderExpenseNoCategoryShowsHintInPlaceOfCategory(t *testing.T) {
	d := completeExpense()
	d.CategoryId = nil
	got := formatMessage(mustRender(t, d, testLedger()))
	if strings.Contains(got, "Groceries") {
		t.Errorf("category should be omitted without a winner:\n%s", got)
	}
	if !strings.Contains(got, "🗂️ <i>No category — pick one in the app</i>") {
		t.Errorf("expected the no-category hint on the category line:\n%s", got)
	}
}

func TestRenderBankTextOmittedWhenSameAsName(t *testing.T) {
	d := completeExpense()
	// No learned name: the raw description is also the shown name.
	d.Vendor = []*prosperv1.StringCandidate{str("AMAZON", weak)}
	got := formatMessage(mustRender(t, d, testLedger()))
	if strings.Contains(got, "Bank text:") {
		t.Errorf("bank text line should be omitted when identical to the name:\n%s", got)
	}
	if !strings.Contains(got, "<b>-£24.99</b> AMAZON ·") {
		t.Errorf("title should show the raw name:\n%s", got)
	}
}

func TestRenderBankTextOmittedWhenOnlyCaseDiffers(t *testing.T) {
	d := completeExpense()
	// The learned name differs from the raw source only by letter case.
	d.Vendor = []*prosperv1.StringCandidate{str("amazon", weak), str("Amazon", learned)}
	got := formatMessage(mustRender(t, d, testLedger()))
	if strings.Contains(got, "Bank text:") {
		t.Errorf("bank text line should be omitted when it differs only by case:\n%s", got)
	}
}

func TestRenderExpenseSharedLine(t *testing.T) {
	d := completeExpense()
	d.SharingType = []*prosperv1.SharingTypeCandidate{{Confidence: learned, Value: prosperv1.SharingType_SHARING_TYPE_PAID_SELF_SHARED}}
	d.Companion = []*prosperv1.StringCandidate{str("Jane", learned)}
	d.OwnShareAmount = []*prosperv1.MoneyCandidate{money(12_500_000_000, learned)}
	got := formatMessage(mustRender(t, d, testLedger()))
	if !strings.Contains(got, "👥 Shared with Jane · your share £12.50") {
		t.Errorf("expected sharing line:\n%s", got)
	}
}

func TestRenderExpenseTagsAreSeparateChips(t *testing.T) {
	d := completeExpense()
	d.Tags = []*prosperv1.TagsCandidate{{Confidence: learned, Value: &prosperv1.TagNames{Names: []string{"groceries", "weekly"}}}}
	got := formatMessage(mustRender(t, d, testLedger()))
	if !strings.Contains(got, "🏷️ <code>groceries</code> <code>weekly</code>") {
		t.Errorf("expected each tag as its own chip:\n%s", got)
	}
	if strings.Contains(got, "#") {
		t.Errorf("tags should not be rendered with a hashtag:\n%s", got)
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
	got := formatMessage(mustRender(t, d, testLedger()))
	want := "<b>£100.00</b> · <i>7 Jul, 14:32</i>\n" +
		"\n" +
		"🏦 Monzo: Current → Monzo: Savings\n" +
		"\n" +
		"<i>Bank text: TRANSFER REF 9</i>"
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
	got := formatMessage(mustRender(t, d, testLedger()))
	want := "<b>£100.00 → €117.00</b> · <i>7 Jul, 14:32</i>\n" +
		"\n" +
		"🏦 Monzo: Current → N26: EUR"
	if got != want {
		t.Errorf("renderDraft:\n got %q\nwant %q", got, want)
	}
}

func TestKeyboardOffersAddOnlyWhenComplete(t *testing.T) {
	complete := buildKeyboard(1, completeExpense(), "https://app.example")
	if !hasButton(complete, "✅ Add") {
		t.Error("a complete draft should offer Add")
	}
	incomplete := completeExpense()
	incomplete.CategoryId = nil
	if hasButton(buildKeyboard(1, incomplete, "https://app.example"), "✅ Add") {
		t.Error("an incomplete draft (no category) must not offer Add")
	}
}

func TestKeyboardAlwaysOffersEditInApp(t *testing.T) {
	kb := buildKeyboard(1, completeExpense(), "https://app.example")
	if !hasButton(kb, "✏️ Edit in app") {
		t.Error("Edit in app should always be offered")
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

func TestCategoryPath(t *testing.T) {
	food := model.Category{ID: 1, Name: "Food"}
	groceries := model.Category{ID: 2, Name: "Groceries", ParentCategoryID: &food.ID}
	offline := model.Category{ID: 3, Name: "Offline", ParentCategoryID: &groceries.ID}
	snap := ledgerWithCategories(food, groceries, offline)

	tests := map[string]struct {
		categoryID int32
		want       string
	}{
		"leaf shows full ancestry": {offline.ID, "Food › Groceries › Offline"},
		"root shows only itself":   {food.ID, "Food"},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			if got := categoryPath(snap, []*prosperv1.IdCandidate{id(tc.categoryID)}); got != tc.want {
				t.Errorf("categoryPath = %q, want %q", got, tc.want)
			}
		})
	}
}

// An ancestry the snapshot cannot resolve leaves the category's own name.
func TestCategoryPathFallsBackToOwnNameOnBrokenChain(t *testing.T) {
	missingParent := int32(99)
	orphan := model.Category{ID: 5, Name: "Orphan", ParentCategoryID: &missingParent}
	if got := categoryPath(ledgerWithCategories(orphan), []*prosperv1.IdCandidate{id(orphan.ID)}); got != "Orphan" {
		t.Errorf("categoryPath with missing parent = %q, want %q", got, "Orphan")
	}

	// A cycle (a → b → a) names no ancestry at all.
	a := model.Category{ID: 6, Name: "A"}
	b := model.Category{ID: 7, Name: "B", ParentCategoryID: &a.ID}
	a.ParentCategoryID = &b.ID
	if got := categoryPath(ledgerWithCategories(a, b), []*prosperv1.IdCandidate{id(a.ID)}); got != "A" {
		t.Errorf("categoryPath with cycle = %q, want %q", got, "A")
	}
}

// ledgerWithCategories builds a snapshot holding only the given categories.
func ledgerWithCategories(categories ...model.Category) *snapshot.Ledger {
	return snapshot.New(nil, nil, nil, nil, nil, nil, nil, nil, nil, categories, nil, nil)
}
