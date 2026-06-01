package ledger

import (
	"context"
	"time"

	"prosper/ledger/common"
	"prosper/model"
	"prosper/moneyutil"
	"prosper/userdb"
)

// syncOpeningBalance brings the OPENING_BALANCE transaction chain for
// a bank account into sync with the requested initial balance. On
// insert the account has no OPENING_BALANCE history yet; on update
// the head of the supersedes chain is replaced.
func syncOpeningBalance(ctx context.Context, tx *userdb.Tx, userID, bankAccountID int32, unit model.Unit, initialBalanceCents int32) error {
	accts, err := common.LoadLedgerAccounts(ctx, tx, userID)
	if err != nil {
		return err
	}
	asset, err := common.MustFindAsset(accts, bankAccountID)
	if err != nil {
		return err
	}
	amountNanos := moneyutil.CentsToNanos(initialBalanceCents)
	existing, err := loadTransactionsForLedgerAccount(ctx, tx, userID, asset.ID, model.TransactionOpeningBalance)
	if err != nil {
		return err
	}
	// Brand new account with no opening balance: there's nothing to record. Skip.
	if len(existing) == 0 && amountNanos == 0 {
		return nil
	}
	iid, supersedesID, err := openingBalanceIIDAndSupersedes(ctx, tx, userID, existing)
	if err != nil {
		return err
	}
	row := model.Transaction{
		UserID:       userID,
		IID:          iid,
		Timestamp:    time.Now(),
		Type:         model.TransactionOpeningBalance,
		SupersedesID: supersedesID,
	}
	if amountNanos == 0 {
		row.IsVoid = true
	}
	newID, err := common.InsertTransactionRow(ctx, tx, row)
	if err != nil {
		return err
	}
	// Zero balance on an account that previously had one is recorded
	// as a header row with no entry lines, so the chain still
	// supersedes the prior version while contributing zero to the
	// books.
	if amountNanos == 0 {
		return nil
	}
	equity, err := common.MustFindByType(accts, model.LedgerAccountEquity)
	if err != nil {
		return err
	}
	lines := []model.EntryLine{
		{LedgerAccountID: asset.ID, CurrencyCode: unit.CurrencyCode, StockExchange: unit.StockExchange, StockTicker: unit.StockTicker, AmountNanos: amountNanos},
		{LedgerAccountID: equity.ID, CurrencyCode: unit.CurrencyCode, StockExchange: unit.StockExchange, StockTicker: unit.StockTicker, AmountNanos: -amountNanos},
	}
	return common.InsertEntryLines(ctx, tx, userID, newID, lines)
}

// openingBalanceIIDAndSupersedes returns (iid, supersedesID) for the new opening-balance row.
func openingBalanceIIDAndSupersedes(ctx context.Context, tx *userdb.Tx, userID int32, existing []model.Transaction) (int32, *int32, error) {
	if len(existing) == 0 {
		// With no prior versions a fresh iid is allocated.
		iid, err := common.AllocateIID(ctx, tx, userID, nil)
		if err != nil {
			return 0, nil, err
		}
		return iid, nil, nil
	}
	// With prior versions the head of the supersedes chain is
	// reused (its iid carries over, its id becomes the supersedesID).
	latest, err := common.ChainHead(existing)
	if err != nil {
		return 0, nil, err
	}
	id := latest.ID
	return latest.IID, &id, nil
}

// loadTransactionsForLedgerAccount returns every transaction of the
// given type that has at least one entry line touching the supplied
// ledger account.
func loadTransactionsForLedgerAccount(ctx context.Context, tx *userdb.Tx, userID, ledgerAccountID int32, txType model.TransactionType) ([]model.Transaction, error) {
	var txs []model.Transaction
	err := tx.SelectForUser(ctx, &txs, userID,
		`SELECT *
		   FROM Transaction
		  WHERE userId = :userId
		    AND type   = :type
		    AND EXISTS (
		      SELECT 1
		        FROM EntryLine
		       WHERE EntryLine.transactionId   = Transaction.id
		         AND EntryLine.ledgerAccountId = :ledgerAccountId
		    )`,
		map[string]any{"type": string(txType), "ledgerAccountId": ledgerAccountID})
	return txs, err
}
