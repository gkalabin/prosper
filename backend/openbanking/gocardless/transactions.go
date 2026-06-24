package gocardless

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"prosper/model"
	"prosper/moneyutil"
)

const transactionsURL = apiBase + "/accounts/%s/transactions/?date_from=%s"

type transactionItem struct {
	TransactionID                   string   `json:"transactionId"`
	InternalTransactionID           string   `json:"internalTransactionId"`
	BookingDate                     string   `json:"bookingDate"`
	BookingDateTime                 string   `json:"bookingDateTime"`
	ValueDate                       string   `json:"valueDate"`
	ValueDateTime                   string   `json:"valueDateTime"`
	CreditorName                    string   `json:"creditorName"`
	RemittanceInfoUnstructured      string   `json:"remittanceInformationUnstructured"`
	RemittanceInfoUnstructuredArray []string `json:"remittanceInformationUnstructuredArray"`
	Amount                          struct {
		Amount   string `json:"amount"`
		Currency string `json:"currency"`
	} `json:"transactionAmount"`
}

type transactionsResponse struct {
	Transactions struct {
		Booked []json.RawMessage `json:"booked"`
	} `json:"transactions"`
}

// FetchTransactions returns the account's booked transactions since the
// given date. Pending entries are deliberately skipped: some banks (e.g.
// Amex) give a pending entry an id unrelated to the one it receives once
// booked, so ingesting it would surface a suggestion that reappears as
// unrecorded the moment it settles.
func (n *Provider) FetchTransactions(ctx context.Context, userID, bankID int32, externalAccountID string, since time.Time) ([]model.OpenBankingTransaction, error) {
	access, err := n.accessToken(ctx, userID, bankID)
	if err != nil {
		return nil, err
	}
	var r transactionsResponse
	if err := n.getJSON(ctx,
		fmt.Sprintf(transactionsURL, externalAccountID, since.Format(dateOnlyFormat)),
		access, &r); err != nil {
		return nil, err
	}
	out := make([]model.OpenBankingTransaction, 0, len(r.Transactions.Booked))
	for _, raw := range r.Transactions.Booked {
		t, ok := parseTransaction(raw, externalAccountID)
		if !ok {
			continue
		}
		out = append(out, t)
	}
	return out, nil
}

// parseTransaction converts a booked transaction, logging and returning
// false for any item with unparsable JSON, timestamp or amount.
func parseTransaction(raw json.RawMessage, accountID string) (model.OpenBankingTransaction, bool) {
	var item transactionItem
	if err := json.Unmarshal(raw, &item); err != nil {
		log.Printf("gocardless: skip unparsable transaction on account %s: %v", accountID, err)
		return model.OpenBankingTransaction{}, false
	}
	ts, err := itemTimestamp(item)
	if err != nil {
		log.Printf("gocardless: transaction %s on account %s: %v", item.TransactionID, accountID, err)
		return model.OpenBankingTransaction{}, false
	}
	amount, err := moneyutil.ParseDecimalToNanos(item.Amount.Amount)
	if err != nil {
		log.Printf("gocardless: transaction %s on account %s: parse amount %q: %v",
			item.TransactionID, accountID, item.Amount.Amount, err)
		return model.OpenBankingTransaction{}, false
	}
	return model.NewOpenBankingTransaction(externalTransactionID(item), ts, description(item), amount, raw), true
}

func externalTransactionID(item transactionItem) string {
	if item.TransactionID != "" {
		return item.TransactionID
	}
	return item.InternalTransactionID
}

func description(item transactionItem) string {
	if item.CreditorName != "" {
		return item.CreditorName
	}
	if len(item.RemittanceInfoUnstructuredArray) > 0 {
		return item.RemittanceInfoUnstructuredArray[0]
	}
	return item.RemittanceInfoUnstructured
}

// itemTimestamp returns the most precise timestamp GoCardless
// supplied for the item. valueDateTime is preferred because it
// represents when the funds become effective; the date-only forms are
// only used as fallbacks.
func itemTimestamp(item transactionItem) (time.Time, error) {
	candidates := []struct {
		value, layout string
	}{
		{item.ValueDateTime, time.RFC3339},
		{item.BookingDateTime, time.RFC3339},
		{item.ValueDate, dateOnlyFormat},
		{item.BookingDate, dateOnlyFormat},
	}
	for _, c := range candidates {
		if c.value == "" {
			continue
		}
		if t, err := time.Parse(c.layout, c.value); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("no parseable timestamp")
}
