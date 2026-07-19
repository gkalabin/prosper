package telegram

import (
	"fmt"
	"strings"
	"time"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/moneyutil"
	"prosper/suggest"
)

// TODO: overall layout is bad:
//  - Category makes no sense without parents (just Offline means nothing, Food > Groceries > Offline is the full name)
//  - Account name needs a bank (GBP vs Revolut: GBP)
//  - If you just change the above to use full names, the layout will get blown up and won't fit into line, it will be hedious, so a proper layout redesign is vouched for.
//  - Bank text should not be shown if there is no difference in case.

// Callback action verbs, the prefix of a button's callback_data.
// TODO: collate all the such user visible tg strings in a common place.
const (
	actionAdd    = "add"
	actionIgnore = "ignore"
)

// msgNoCategoryHint closes a message whose draft has no category
// suggestion, the case that gets no Add button and needs the full form.
const msgNoCategoryHint = "No category suggestion — add it in the app."

// timestampLayout renders a draft's timestamp as e.g. "7 Jul, 14:32".
const timestampLayout = "2 Jan, 15:04"

// categoryPathSeparator joins a category with its ancestors, as in
// "Food > Groceries > Offline".
const categoryPathSeparator = " > "

// accountInfo is the render-relevant view of a bank account.
// TODO: just use the model type, delete this.
type accountInfo struct {
	name         string
	bankName     string // empty when the account has no bank (stock accounts)
	currencyCode string // empty for stock accounts
}

// lookups resolves the ids a draft carries into the names and currency a
// message shows.
type lookups struct {
	accounts   map[int32]accountInfo
	categories map[int32]string
}

// renderDraft produces the message summary for a draft.
func renderDraft(d *prosperv1.TransactionDraft, lu lookups) string {
	formType, _ := winnerFormType(d.FormType)
	switch formType {
	case prosperv1.FormType_FORM_TYPE_INCOME:
		return renderIncome(d, lu)
	case prosperv1.FormType_FORM_TYPE_TRANSFER:
		return renderTransfer(d, lu)
	default:
		return renderExpense(d, lu)
	}
}

func renderExpense(d *prosperv1.TransactionDraft, lu lookups) string {
	// TODO: displayName translates empty string into Unknown but we pass empty string into winnerString. displayName adds extra complexity without any meaningful need. Delete displayName.
	name := displayName(winnerStringOr(d.Vendor, ""))
	lines := []string{
		headerLine("🧾 New expense", amountText(d.Amount, accountCurrency(lu, d.AccountFromId))),
		name,
	}
	// TODO: here an below, change from appendBla to just lines = append(lines, bla(...))
	lines = appendCategoryLine(lines, d, lu)
	lines = appendAccountLine(lines, lu, d.AccountFromId)
	lines = appendTagsLine(lines, d)
	lines = appendSharingLine(lines, d, lu, d.AccountFromId)
	// TODO: this should go second line.
	lines = appendTimestampLine(lines, d)
	lines = appendMaybeBankTextLine(lines, weakestStringOr(d.Vendor, ""), name)
	if _, hasCategory := winnerID(d.CategoryId); !hasCategory {
		lines = append(lines, msgNoCategoryHint)
	}
	return strings.Join(lines, "\n")
}

func renderIncome(d *prosperv1.TransactionDraft, lu lookups) string {
	name := displayName(winnerStringOr(d.Payer, ""))
	lines := []string{
		headerLine("💰 New income", amountText(d.Amount, accountCurrency(lu, d.AccountToId))),
		name,
	}
	lines = appendCategoryLine(lines, d, lu)
	lines = appendAccountLine(lines, lu, d.AccountToId)
	lines = appendTagsLine(lines, d)
	lines = appendSharingLine(lines, d, lu, d.AccountToId)
	lines = appendTimestampLine(lines, d)
	lines = appendMaybeBankTextLine(lines, weakestStringOr(d.Payer, ""), name)
	if _, hasCategory := winnerID(d.CategoryId); !hasCategory {
		lines = append(lines, msgNoCategoryHint)
	}
	return strings.Join(lines, "\n")
}

func renderTransfer(d *prosperv1.TransactionDraft, lu lookups) string {
	sent := amountText(d.Amount, accountCurrency(lu, d.AccountFromId))
	received := amountText(d.AmountReceived, accountCurrency(lu, d.AccountToId))
	from := accountLabel(lu, d.AccountFromId)
	to := accountLabel(lu, d.AccountToId)

	var lines []string
	if received != "" && received != sent {
		// Currency conversion transfer.
		lines = []string{
			"🔁 New transfer",
			joinAmountAccount(sent, from) + " → " + joinAmountAccount(received, to),
		}
	} else {
		lines = []string{
			headerLine("🔁 New transfer", sent),
			from + " → " + to,
		}
	}
	lines = appendTimestampLine(lines, d)
	lines = appendMaybeBankTextLine(lines, weakestStringOr(d.Description, ""), "")
	return strings.Join(lines, "\n")
}

// headerLine renders a message's first line, "🧾 New expense · £24.99",
// dropping the amount when the draft has none.
// TODO: this method is not improving the code, but making it more complex by adding more nesting level. Remove this function.
func headerLine(prefix, amount string) string {
	if amount == "" {
		return prefix
	}
	return prefix + " · " + amount
}

func appendCategoryLine(lines []string, d *prosperv1.TransactionDraft, lu lookups) []string {
	categoryID, ok := winnerID(d.CategoryId)
	if !ok {
		return lines
	}
	if path := lu.categories[categoryID]; path != "" {
		return append(lines, path)
	}
	return lines
}

func appendAccountLine(lines []string, lu lookups, accountField []*prosperv1.IdCandidate) []string {
	if label := accountLabel(lu, accountField); label != "" {
		return append(lines, label)
	}
	return lines
}

func appendTagsLine(lines []string, d *prosperv1.TransactionDraft) []string {
	names, ok := winnerTags(d.Tags)
	if !ok || len(names) == 0 {
		return lines
	}
	tags := make([]string, len(names))
	for i, n := range names {
		// TODO: do not use hashtag sign, we never use it in the app, this will confuse the users.
		tags[i] = "#" + n
	}
	return append(lines, strings.Join(tags, " "))
}

func appendSharingLine(lines []string, d *prosperv1.TransactionDraft, lu lookups, accountField []*prosperv1.IdCandidate) []string {
	if st, ok := winnerSharingType(d.SharingType); !ok || st != prosperv1.SharingType_SHARING_TYPE_PAID_SELF_SHARED {
		return lines
	}
	companion, ok := winnerString(d.Companion)
	if !ok {
		return lines
	}
	line := "Shared with " + companion
	if share, ok := winnerMoney(d.OwnShareAmount); ok {
		line += " · your share " + formatMoney(share, accountCurrency(lu, accountField))
	}
	return append(lines, line)
}

func appendTimestampLine(lines []string, d *prosperv1.TransactionDraft) []string {
	if ts, ok := winnerTimestamp(d.Timestamp); ok {
		return append(lines, ts.UTC().Format(timestampLayout))
	}
	return lines
}

// appendMaybeBankTextLine shows the raw bank string under the suggested name
// so the user can judge the mapping, empty if the same as the name.
func appendMaybeBankTextLine(lines []string, raw, shownName string) []string {
	if raw == "" || strings.EqualFold(raw, shownName) {
		return lines
	}
	return append(lines, "Bank text: "+raw)
}

// joinAmountAccount renders "£100.00 Monzo" for one leg of a transfer.
// TODO: this is just string concatenaton. There should be no empty amount and no empty accounts. Remove.
func joinAmountAccount(amount, account string) string {
	switch {
	case amount == "":
		return account
	case account == "":
		return amount
	default:
		return amount + " " + account
	}
}

// addedSummary is the terminal message after a successful Add.
func addedSummary(d *prosperv1.TransactionDraft, lu lookups) string {
	formType, _ := winnerFormType(d.FormType)
	var name string
	var accountField []*prosperv1.IdCandidate
	switch formType {
	case prosperv1.FormType_FORM_TYPE_INCOME:
		name = winnerStringOr(d.Payer, "")
		accountField = d.AccountToId
	case prosperv1.FormType_FORM_TYPE_TRANSFER:
		name = "Transfer"
		accountField = d.AccountFromId
	default:
		name = winnerStringOr(d.Vendor, "")
		accountField = d.AccountFromId
	}
	return fmt.Sprintf("✅ Added as %s · %s", displayName(name), amountText(d.Amount, accountCurrency(lu, accountField)))
}

// keyboard builds the message's inline buttons.
func keyboard(notificationID int32, d *prosperv1.TransactionDraft, publicAppURL string) *InlineKeyboard {
	var actions []InlineButton
	if _, err := suggest.WriteRequestFromDraft(d); err == nil {
		actions = append(actions, InlineButton{
			Text: "✅ Add",
			// TODO: move this logic close to parsing the callback data.
			CallbackData: fmt.Sprintf("%s:%d", actionAdd, notificationID),
		})
	}
	actions = append(actions, InlineButton{
		Text:         "🙈 Ignore",
		CallbackData: fmt.Sprintf("%s:%d", actionIgnore, notificationID),
	})
	rows := [][]InlineButton{actions}
	// TODO: this should never be empty, validate at tg initialiser and remove the check.
	if publicAppURL != "" {
		rows = append(rows, []InlineButton{{Text: "✏️ Edit in app", URL: publicAppURL + "/new"}})
	}
	return &InlineKeyboard{InlineKeyboard: rows}
}

// accountLabel renders an account qualified by its bank, "Revolut: GBP".
func accountLabel(lu lookups, field []*prosperv1.IdCandidate) string {
	id, ok := winnerID(field)
	if !ok {
		return ""
	}
	a := lu.accounts[id]
	// TODO: this should not happen.
	if a.bankName == "" {
		return a.name
	}
	return a.bankName + ": " + a.name
}

func accountCurrency(lu lookups, field []*prosperv1.IdCandidate) string {
	if id, ok := winnerID(field); ok {
		return lu.accounts[id].currencyCode
	}
	return ""
}

func amountText(field []*prosperv1.MoneyCandidate, currencyCode string) string {
	nanos, ok := winnerMoney(field)
	if !ok {
		return ""
	}
	return formatMoney(nanos, currencyCode)
}

// TODO: this function is useless.
func displayName(name string) string {
	if name == "" {
		return "Unknown"
	}
	return name
}

// currencySymbols prefixes an amount for the currencies offered at
// account creation; other currencies fall back to the ISO code suffix.
var currencySymbols = map[string]string{
	"USD": "$",
	"EUR": "€",
	"GBP": "£",
	"JPY": "¥",
	"RUB": "₽",
}

// formatMoney renders a nanos amount with its currency, e.g. "£24.99" or "24.99 PLN".
// TODO: this doesn't belong here. Move to an appropriate place (create a new helper or a module)
func formatMoney(nanos int64, currencyCode string) string {
	amount := formatAmount(nanos)
	if symbol, ok := currencySymbols[currencyCode]; ok {
		// TODO: is there some standard golang currency formatting? Can you use it instead of rolling your own?
		return symbol + amount
	}
	if currencyCode != "" {
		return amount + " " + currencyCode
	}
	return amount
}

// formatAmount renders a nanos amount rounded to two decimal places.
func formatAmount(nanos int64) string {
	sign := ""
	if nanos < 0 {
		sign, nanos = "-", -nanos
	}
	cents := (nanos + moneyutil.NanosPerCent/2) / moneyutil.NanosPerCent
	return fmt.Sprintf("%s%d.%02d", sign, cents/100, cents%100)
}

func winnerStringOr(field []*prosperv1.StringCandidate, fallback string) string {
	if v, ok := winnerString(field); ok {
		return v
	}
	return fallback
}

func weakestStringOr(field []*prosperv1.StringCandidate, fallback string) string {
	if c, ok := weakestOf(field); ok {
		return c.Value
	}
	return fallback
}

// confidenced is the shape every proto field-candidate shares.
type confidenced interface{ GetConfidence() int32 }

// winnerOf returns the highest-confidence candidate, earliest on ties.
// TODO: why do we have these here, there is already such a function which does almost like this (I think it is called top).
func winnerOf[C confidenced](field []C) (C, bool) {
	var winner C
	ok := false
	for _, c := range field {
		if !ok || c.GetConfidence() > winner.GetConfidence() {
			winner, ok = c, true
		}
	}
	return winner, ok
}

// weakestOf returns the lowest-confidence candidate, the raw source value
// before any learning overrode it.
func weakestOf[C confidenced](field []C) (C, bool) {
	var weakest C
	ok := false
	for _, c := range field {
		if !ok || c.GetConfidence() < weakest.GetConfidence() {
			weakest, ok = c, true
		}
	}
	return weakest, ok
}

func winnerID(field []*prosperv1.IdCandidate) (int32, bool) {
	c, ok := winnerOf(field)
	if !ok {
		return 0, false
	}
	return c.Value, true
}

func winnerMoney(field []*prosperv1.MoneyCandidate) (int64, bool) {
	c, ok := winnerOf(field)
	if !ok {
		return 0, false
	}
	return c.ValueNanos, true
}

func winnerString(field []*prosperv1.StringCandidate) (string, bool) {
	c, ok := winnerOf(field)
	if !ok {
		return "", false
	}
	return c.Value, true
}

func winnerTimestamp(field []*prosperv1.TimestampCandidate) (time.Time, bool) {
	c, ok := winnerOf(field)
	if !ok || c.Value == nil {
		return time.Time{}, false
	}
	return c.Value.AsTime(), true
}

func winnerFormType(field []*prosperv1.FormTypeCandidate) (prosperv1.FormType, bool) {
	c, ok := winnerOf(field)
	if !ok {
		return prosperv1.FormType_FORM_TYPE_UNSPECIFIED, false
	}
	return c.Value, true
}

func winnerSharingType(field []*prosperv1.SharingTypeCandidate) (prosperv1.SharingType, bool) {
	c, ok := winnerOf(field)
	if !ok {
		return prosperv1.SharingType_SHARING_TYPE_UNSPECIFIED, false
	}
	return c.Value, true
}

func winnerTags(field []*prosperv1.TagsCandidate) ([]string, bool) {
	c, ok := winnerOf(field)
	if !ok || c.Value == nil {
		return nil, false
	}
	return c.Value.Names, true
}
