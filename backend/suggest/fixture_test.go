package suggest

import (
	"time"

	"google.golang.org/protobuf/proto"

	"prosper/ledger/snapshot"
	"prosper/model"
)

// Ledger account ids used across the test fixture.
const (
	ledgerAccountChecking   int32 = 101
	ledgerAccountJoint      int32 = 102
	ledgerAccountSavings    int32 = 103
	ledgerAccountExpense    int32 = 201
	ledgerAccountIncome     int32 = 202
	ledgerAccountFx         int32 = 203
	ledgerAccountReceivable int32 = 204
)

// Bank account ids used across the test fixture.
const (
	bankAccountChecking int32 = 1
	bankAccountJoint    int32 = 2
	bankAccountSavings  int32 = 3
)

// dayZero anchors the fixture timeline; day(n) is n days after it.
var dayZero = time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)

// day returns the timestamp n days after dayZero.
func day(n int) time.Time { return dayZero.AddDate(0, 0, n) }

// fixture accumulates model rows and assembles them into a snapshot.
type fixture struct {
	txs            []model.Transaction
	lines          []model.EntryLine
	splits         []model.SplitContext
	ledgerAccounts []model.LedgerAccount
	links          []model.TransactionLink
	origins        []model.TransactionOrigin
	descriptions   []snapshot.OpenBankingDescription
	bankAccounts   []model.BankAccount
}

func newFixture() *fixture {
	return &fixture{
		bankAccounts: []model.BankAccount{
			{ID: bankAccountChecking, Name: "Checking", CurrencyCode: proto.String("USD")},
			{ID: bankAccountJoint, Name: "Joint", CurrencyCode: proto.String("USD"), Joint: true},
			{ID: bankAccountSavings, Name: "Savings", CurrencyCode: proto.String("USD")},
		},
		ledgerAccounts: []model.LedgerAccount{
			{ID: ledgerAccountChecking, Type: model.LedgerAccountAsset, BankAccountID: proto.Int32(bankAccountChecking)},
			{ID: ledgerAccountJoint, Type: model.LedgerAccountAsset, BankAccountID: proto.Int32(bankAccountJoint)},
			{ID: ledgerAccountSavings, Type: model.LedgerAccountAsset, BankAccountID: proto.Int32(bankAccountSavings)},
			{ID: ledgerAccountExpense, Type: model.LedgerAccountExpense},
			{ID: ledgerAccountIncome, Type: model.LedgerAccountIncome},
			{ID: ledgerAccountFx, Type: model.LedgerAccountCurrencyExchange},
			{ID: ledgerAccountReceivable, Type: model.LedgerAccountReceivable},
		},
	}
}

func (f *fixture) snapshot() *snapshot.Ledger {
	return snapshot.New(f.txs, f.lines, f.splits,
		f.ledgerAccounts, f.links, f.origins, f.descriptions, f.bankAccounts)
}

func usdLine(transactionID, ledgerAccountID int32, amountNanos int64) model.EntryLine {
	return model.EntryLine{
		TransactionID:   transactionID,
		LedgerAccountID: ledgerAccountID,
		CurrencyCode:    proto.String("USD"),
		AmountNanos:     amountNanos,
	}
}

// addExpense records a personal expense paid from the asset ledger account.
func (f *fixture) addExpense(id int32, ts time.Time, vendor string, categoryID, assetLedgerID int32, amountNanos int64) {
	f.txs = append(f.txs, model.Transaction{
		ID:         id,
		Timestamp:  ts,
		Type:       model.TransactionExpense,
		Vendor:     &vendor,
		CategoryID: &categoryID,
	})
	f.lines = append(f.lines,
		usdLine(id, assetLedgerID, -amountNanos),
		usdLine(id, ledgerAccountExpense, amountNanos),
	)
}

// addSharedExpense records an expense split with a companion.
func (f *fixture) addSharedExpense(id int32, ts time.Time, vendor string, categoryID, assetLedgerID int32, amountNanos, ownShareNanos int64, companion string) {
	f.addExpense(id, ts, vendor, categoryID, assetLedgerID, amountNanos)
	f.splits = append(f.splits, model.SplitContext{
		TransactionID:       id,
		CompanionName:       companion,
		CompanionShareNanos: amountNanos - ownShareNanos,
	})
}

// addThirdPartyExpense records an expense someone else paid for the user.
func (f *fixture) addThirdPartyExpense(id int32, ts time.Time, vendor, payer string, categoryID int32, amountNanos, ownShareNanos int64) {
	f.txs = append(f.txs, model.Transaction{
		ID:         id,
		Timestamp:  ts,
		Type:       model.TransactionThirdPartyExpense,
		Vendor:     &vendor,
		Payer:      &payer,
		CategoryID: &categoryID,
	})
	f.lines = append(f.lines,
		usdLine(id, ledgerAccountExpense, ownShareNanos),
		usdLine(id, ledgerAccountReceivable, -ownShareNanos),
	)
	f.splits = append(f.splits, model.SplitContext{
		TransactionID:       id,
		CompanionName:       payer,
		CompanionShareNanos: amountNanos - ownShareNanos,
		CompanionPaidNanos:  amountNanos,
	})
}

// addIncome records a solo income into the asset ledger account.
func (f *fixture) addIncome(id int32, ts time.Time, payer string, categoryID, assetLedgerID int32, amountNanos int64) {
	f.txs = append(f.txs, model.Transaction{
		ID:         id,
		Timestamp:  ts,
		Type:       model.TransactionIncome,
		Payer:      &payer,
		CategoryID: &categoryID,
	})
	f.lines = append(f.lines,
		usdLine(id, assetLedgerID, amountNanos),
		usdLine(id, ledgerAccountIncome, -amountNanos),
	)
}

// addTransfer records a same-currency transfer between two asset
// ledger accounts.
func (f *fixture) addTransfer(id int32, ts time.Time, categoryID, fromLedgerID, toLedgerID int32, sentNanos, receivedNanos int64) {
	f.txs = append(f.txs, model.Transaction{
		ID:         id,
		Timestamp:  ts,
		Type:       model.TransactionTransfer,
		CategoryID: &categoryID,
	})
	f.lines = append(f.lines,
		usdLine(id, fromLedgerID, -sentNanos),
		usdLine(id, toLedgerID, receivedNanos),
	)
}

func modelDebtLink(expenseID, repaymentID int32) model.TransactionLink {
	return model.TransactionLink{
		SourceTransactionID: expenseID,
		LinkedTransactionID: repaymentID,
		LinkType:            model.LinkDebtSettling,
	}
}

// addOpenBankingOrigin links an open banking transaction's external id to a
// recorded transaction, recording the raw text the bank reported for it.
func (f *fixture) addOpenBankingOrigin(externalID, externalDescription string, transactionID int32) {
	f.origins = append(f.origins, model.TransactionOrigin{
		OriginKind:            model.OriginOpenBanking,
		Key:                   externalID,
		InternalTransactionID: transactionID,
	})
	f.descriptions = append(f.descriptions, snapshot.OpenBankingDescription{
		ExternalID:  externalID,
		Description: externalDescription,
	})
}
