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
	TransactionID              string   `json:"transactionId"`
	InternalTransactionID      string   `json:"internalTransactionId"`
	BookingDate                string   `json:"bookingDate"`
	BookingDateTime            string   `json:"bookingDateTime"`
	ValueDate                  string   `json:"valueDate"`
	ValueDateTime              string   `json:"valueDateTime"`
	CreditorName               string   `json:"creditorName"`
	RemittanceInfoUnstructured []string `json:"remittanceInformationUnstructuredArray"`
	Amount                     struct {
		Amount   string `json:"amount"`
		Currency string `json:"currency"`
	} `json:"transactionAmount"`
}

type transactionsResponse struct {
	Transactions struct {
		Booked  []json.RawMessage `json:"booked"`
		Pending []json.RawMessage `json:"pending"`
	} `json:"transactions"`
}

// FetchTransactions returns GoCardless's transactions
// for the external account.
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
	out := make([]model.OpenBankingTransaction, 0, len(r.Transactions.Booked)+len(r.Transactions.Pending))
	out = appendItems(out, r.Transactions.Booked, "booked", externalAccountID)
	out = appendItems(out, r.Transactions.Pending, "pending", externalAccountID)
	return out, nil
}

// appendItems converts and appends each item, logging and skipping any
// item with unparsable JSON, timestamp or amount.
func appendItems(out []model.OpenBankingTransaction, items []json.RawMessage, kind, accountID string) []model.OpenBankingTransaction {
	for _, raw := range items {
		var item transactionItem
		if err := json.Unmarshal(raw, &item); err != nil {
			log.Printf("gocardless: skip unparsable %s transaction on account %s: %v", kind, accountID, err)
			continue
		}
		ts, err := itemTimestamp(item)
		if err != nil {
			log.Printf("gocardless: %s transaction %s on account %s: %v", kind, item.TransactionID, accountID, err)
			continue
		}
		amount, err := moneyutil.ParseDecimalToNanos(item.Amount.Amount)
		if err != nil {
			log.Printf("gocardless: %s transaction %s on account %s: parse amount %q: %v",
				kind, item.TransactionID, accountID, item.Amount.Amount, err)
			continue
		}
		out = append(out, model.NewOpenBankingTransaction(externalTransactionID(item), ts, description(item), amount, raw))
	}
	return out
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
	if len(item.RemittanceInfoUnstructured) > 0 {
		return item.RemittanceInfoUnstructured[0]
	}
	return ""
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
