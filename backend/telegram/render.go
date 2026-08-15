package telegram

import (
	"embed"
	"fmt"
	"strings"
	"text/template"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger/snapshot"
	"prosper/model"
	"prosper/suggest"
)

// The layouts, named by the file each is written in.
const (
	expenseTitleLayout  = "expense_title.tmpl"
	expenseBodyLayout   = "expense_body.tmpl"
	incomeTitleLayout   = "income_title.tmpl"
	incomeBodyLayout    = "income_body.tmpl"
	transferTitleLayout = "transfer_title.tmpl"
	transferBodyLayout  = "transfer_body.tmpl"
)

//go:embed *.tmpl
var layoutFiles embed.FS

var layoutFuncs = template.FuncMap{
	"esc":       escapeHTML,
	"chips":     chips,
	"equalFold": strings.EqualFold,
}

var layouts = template.Must(template.New("message").Funcs(layoutFuncs).ParseFS(layoutFiles, "*.tmpl"))

func renderDraft(d *prosperv1.TransactionDraft, snap *snapshot.Ledger) (model.TelegramMessage, error) {
	var (
		kind        model.TransactionType
		titleLayout string
		bodyLayout  string
		v           draftView
	)
	formType, _ := suggest.TopFormType(d.FormType)
	switch formType {
	case prosperv1.FormType_FORM_TYPE_EXPENSE:
		kind, titleLayout, bodyLayout, v = model.TransactionExpense, expenseTitleLayout, expenseBodyLayout, expenseView(d, snap)
	case prosperv1.FormType_FORM_TYPE_INCOME:
		kind, titleLayout, bodyLayout, v = model.TransactionIncome, incomeTitleLayout, incomeBodyLayout, incomeView(d, snap)
	case prosperv1.FormType_FORM_TYPE_TRANSFER:
		kind, titleLayout, bodyLayout, v = model.TransactionTransfer, transferTitleLayout, transferBodyLayout, transferView(d, snap)
	default:
		return model.TelegramMessage{}, fmt.Errorf("unsupported form type %v", formType)
	}
	title, err := renderLayout(titleLayout, v)
	if err != nil {
		return model.TelegramMessage{}, err
	}
	body, err := renderLayout(bodyLayout, v)
	if err != nil {
		return model.TelegramMessage{}, err
	}
	return model.TelegramMessage{Kind: kind, Title: title, Body: body}, nil
}

func renderLayout(name string, v draftView) (string, error) {
	var out strings.Builder
	if err := layouts.ExecuteTemplate(&out, name, v); err != nil {
		return "", fmt.Errorf("render %s: %w", name, err)
	}
	return strings.TrimSpace(out.String()), nil
}

// formatMessage joins a message into the single text Telegram displays.
func formatMessage(m model.TelegramMessage) string {
	return m.Title + "\n\n" + m.Body
}

func chips(values []string) string {
	labels := make([]string, 0, len(values))
	for _, v := range values {
		labels = append(labels, code(v))
	}
	return strings.Join(labels, " ")
}

// callbackAction is a button's callback verb, the prefix of its callback_data.
type callbackAction string

const actionAdd callbackAction = "add"

// buildKeyboard builds the message's inline buttons.
func buildKeyboard(notificationID int32, d *prosperv1.TransactionDraft, publicAppURL string) *InlineKeyboard {
	var row []InlineButton
	if _, err := suggest.WriteRequestFromDraft(d); err == nil {
		row = append(row, InlineButton{
			Text:         "✅ Add",
			CallbackData: formatCallback(actionAdd, notificationID),
		})
	}
	row = append(row, InlineButton{Text: "✏️ Edit in app", URL: publicAppURL + "/new"})
	return &InlineKeyboard{InlineKeyboard: [][]InlineButton{row}}
}
