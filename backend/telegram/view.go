package telegram

import (
	"fmt"
	"log"
	"slices"
	"strings"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger/snapshot"
	"prosper/model"
	"prosper/moneyutil"
	"prosper/suggest"
)

const timestampFormat = "2 Jan, 15:04"

type draftView struct {
	Amount string
	// The amount landing in the receiving account of a transfer.
	TransferAmountReceived string
	// The party an expense was paid to.
	Vendor string
	// The party an income was received from.
	Payer                            string
	Timestamp                        string
	CategoryPath                     string
	AccountWithBank                  string
	TransferReceivingAccountWithBank string
	Tags                             []string
	Companion                        string
	OwnShare                         string
	// BankText is the string the bank itself sent.
	BankText string
}

func expenseView(d *prosperv1.TransactionDraft, snap *snapshot.Ledger) draftView {
	vendor, _ := suggest.TopString(d.Vendor)
	tags, _ := suggest.TopTags(d.Tags)
	currency := accountCurrency(snap, d.AccountFromId)
	return draftView{
		Amount:          amountText(d.Amount, currency),
		Vendor:          vendor,
		Timestamp:       timestampText(d),
		CategoryPath:    categoryPath(snap, d.CategoryId),
		AccountWithBank: accountLabel(snap, d.AccountFromId),
		Tags:            tags,
		Companion:       companionName(d),
		OwnShare:        amountText(d.OwnShareAmount, currency),
		BankText:        bankText(d.Vendor),
	}
}

func incomeView(d *prosperv1.TransactionDraft, snap *snapshot.Ledger) draftView {
	payer, _ := suggest.TopString(d.Payer)
	tags, _ := suggest.TopTags(d.Tags)
	currency := accountCurrency(snap, d.AccountToId)
	return draftView{
		Amount:          amountText(d.Amount, currency),
		Payer:           payer,
		Timestamp:       timestampText(d),
		CategoryPath:    categoryPath(snap, d.CategoryId),
		AccountWithBank: accountLabel(snap, d.AccountToId),
		Tags:            tags,
		Companion:       companionName(d),
		OwnShare:        amountText(d.OwnShareAmount, currency),
		BankText:        bankText(d.Payer),
	}
}

func transferView(d *prosperv1.TransactionDraft, snap *snapshot.Ledger) draftView {
	return draftView{
		Amount:                           amountText(d.Amount, accountCurrency(snap, d.AccountFromId)),
		TransferAmountReceived:           amountText(d.AmountReceived, accountCurrency(snap, d.AccountToId)),
		Timestamp:                        timestampText(d),
		AccountWithBank:                  accountLabel(snap, d.AccountFromId),
		TransferReceivingAccountWithBank: accountLabel(snap, d.AccountToId),
		BankText:                         bankText(d.Description),
	}
}

func timestampText(d *prosperv1.TransactionDraft) string {
	ts, ok := suggest.TopTimestamp(d.Timestamp)
	if !ok {
		return ""
	}
	return ts.AsTime().UTC().Format(timestampFormat)
}

func amountText(field []*prosperv1.MoneyCandidate, currencyCode string) string {
	nanos, ok := suggest.TopMoney(field)
	if !ok {
		return ""
	}
	return moneyutil.FormatMoney(nanos, currencyCode)
}

// categoryPath is the draft's category with its ancestors,
// e.g. "Food › Groceries › Offline".
func categoryPath(snap *snapshot.Ledger, field []*prosperv1.IdCandidate) string {
	categoryID, ok := suggest.TopID(field)
	if !ok {
		return ""
	}
	c, ok := snap.CategoryByID[categoryID]
	if !ok {
		return ""
	}
	names, err := ancestry(snap, c)
	if err != nil {
		log.Printf("telegram: category %d ancestry: %v", c.ID, err)
		return c.Name
	}
	return strings.Join(names, " › ")
}

// ancestry names a category and every category above it, outermost first.
func ancestry(snap *snapshot.Ledger, c model.Category) ([]string, error) {
	names := []string{c.Name}
	seen := map[int32]bool{c.ID: true}
	for c.ParentCategoryID != nil {
		parent, ok := snap.CategoryByID[*c.ParentCategoryID]
		if !ok {
			return nil, fmt.Errorf("parent %d of category %d is not in the ledger", *c.ParentCategoryID, c.ID)
		}
		if seen[parent.ID] {
			return nil, fmt.Errorf("category %d is its own ancestor", parent.ID)
		}
		names = append(names, parent.Name)
		seen[parent.ID] = true
		c = parent
	}
	slices.Reverse(names)
	return names, nil
}

// accountLabel names an account qualified by its bank, "Monzo: Current".
func accountLabel(snap *snapshot.Ledger, field []*prosperv1.IdCandidate) string {
	id, ok := suggest.TopID(field)
	if !ok {
		return ""
	}
	a, ok := snap.BankAccountByID[id]
	if !ok {
		return ""
	}
	if bank, ok := snap.BankByID[a.BankID]; ok {
		return bank.Name + ": " + a.Name
	}
	// Fall back to the bare account name if the snapshot somehow lacks bank name.
	return a.Name
}

func accountCurrency(snap *snapshot.Ledger, field []*prosperv1.IdCandidate) string {
	id, ok := suggest.TopID(field)
	if !ok {
		return ""
	}
	if a, ok := snap.BankAccountByID[id]; ok && a.CurrencyCode != nil {
		return *a.CurrencyCode
	}
	return ""
}

func companionName(d *prosperv1.TransactionDraft) string {
	if st, ok := suggest.TopSharingType(d.SharingType); !ok || st != prosperv1.SharingType_SHARING_TYPE_PAID_SELF_SHARED {
		return ""
	}
	name, _ := suggest.TopString(d.Companion)
	return name
}

// bankText is the raw string the bank sent.
func bankText(field []*prosperv1.StringCandidate) string {
	var raw *prosperv1.StringCandidate
	for _, c := range field {
		if raw == nil || c.Confidence < raw.Confidence {
			raw = c
		}
	}
	return raw.GetValue()
}
