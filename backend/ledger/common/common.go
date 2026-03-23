// Package common holds the low-level ledger write primitives shared
// across the ledger package.
package common

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"prosper/model"
	"prosper/userdb"
)

// LoadLedgerAccounts returns every ledger account belonging to the user.
func LoadLedgerAccounts(ctx context.Context, tx *userdb.Tx, userID int32) ([]model.LedgerAccount, error) {
	var accts []model.LedgerAccount
	if err := tx.SelectForUser(ctx, &accts, userID,
		`SELECT * FROM LedgerAccount WHERE userId = :userId`); err != nil {
		return nil, err
	}
	return accts, nil
}

// LoadBankAccountUnit reads the unit of a single bank account.
func LoadBankAccountUnit(ctx context.Context, tx *userdb.Tx, userID, bankAccountID int32) (model.Unit, error) {
	var unit model.Unit
	err := tx.GetForUser(ctx, &unit, userID,
		`SELECT currencyCode,
		        stockId
		   FROM BankAccount
		  WHERE id     = :id
		    AND userId = :userId`,
		map[string]any{"id": bankAccountID})
	if err != nil {
		return model.Unit{}, fmt.Errorf("bank account %d: %w", bankAccountID, err)
	}
	if _, err := model.NewUnit(unit.CurrencyCode, unit.StockID); err != nil {
		return model.Unit{}, fmt.Errorf("bank account %d: %w", bankAccountID, err)
	}
	return unit, nil
}

// MustFindByType returns the unique ledger account of type t. Errors
// if the result is not unique or is not found.
func MustFindByType(accts []model.LedgerAccount, t model.LedgerAccountType) (model.LedgerAccount, error) {
	matches := make([]model.LedgerAccount, 0, 1)
	for _, a := range accts {
		if a.Type == t {
			matches = append(matches, a)
		}
	}
	if len(matches) != 1 {
		ids := make([]int32, 0, len(matches))
		for _, m := range matches {
			ids = append(ids, m.ID)
		}
		return model.LedgerAccount{}, fmt.Errorf("expected 1 ledger account of type %s, found %d (ids: %v)", t, len(matches), ids)
	}
	return matches[0], nil
}

// MustFindAsset returns the ASSET ledger account that mirrors the
// given bank account. Each BankAccount has exactly one ASSET
// LedgerAccount, created at insert time in UpsertBankAccount.
func MustFindAsset(accts []model.LedgerAccount, bankAccountID int32) (model.LedgerAccount, error) {
	matches := make([]model.LedgerAccount, 0, 1)
	for _, a := range accts {
		if a.Type == model.LedgerAccountAsset && a.BankAccountID != nil && *a.BankAccountID == bankAccountID {
			matches = append(matches, a)
		}
	}
	if len(matches) != 1 {
		return model.LedgerAccount{}, fmt.Errorf("expected 1 ASSET ledger account for bank account %d, found %d", bankAccountID, len(matches))
	}
	return matches[0], nil
}

// GetOrCreateReceivable returns the existing RECEIVABLE ledger account
// for the named companion, creating one if missing. Newly created
// rows are appended to *accts so subsequent calls within the same DB
// transaction (e.g. a repayment alongside its expense) find them.
func GetOrCreateReceivable(ctx context.Context, tx *userdb.Tx, userID int32, accts *[]model.LedgerAccount, companion string) (model.LedgerAccount, error) {
	name := "RECEIVABLE:" + companion
	for _, a := range *accts {
		if a.Type == model.LedgerAccountReceivable && a.Name == name {
			return a, nil
		}
	}
	row := model.LedgerAccount{UserID: userID, Name: name, Type: model.LedgerAccountReceivable}
	res, err := tx.NamedExecForUser(ctx, userID,
		`INSERT INTO LedgerAccount
		        ( userId,  name,  type)
		 VALUES (:userId, :name, :type)`,
		row)
	if err != nil {
		return model.LedgerAccount{}, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return model.LedgerAccount{}, err
	}
	row.ID = int32(id)
	*accts = append(*accts, row)
	return row, nil
}

// GetOrCreateTrip returns the id of the trip with the given name,
// creating a row when no match exists.
func GetOrCreateTrip(ctx context.Context, tx *userdb.Tx, userID int32, name *string) (*int32, error) {
	if name == nil || *name == "" {
		return nil, nil
	}
	var id int32
	err := tx.GetForUser(ctx, &id, userID,
		`SELECT id
		   FROM Trip
		  WHERE userId = :userId
		    AND name   = :name`,
		map[string]any{"name": *name})
	if err == nil {
		return &id, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	row := model.Trip{UserID: userID, Name: *name}
	res, err := tx.NamedExecForUser(ctx, userID,
		`INSERT INTO Trip
		        ( userId,  name)
		 VALUES (:userId, :name)`,
		row)
	if err != nil {
		return nil, err
	}
	newID, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	out := int32(newID)
	return &out, nil
}

// InsertTransactionRow writes a Transaction row from a fully-populated
// model and returns the new row id.
func InsertTransactionRow(ctx context.Context, tx *userdb.Tx, row model.Transaction) (int64, error) {
	res, err := tx.NamedExecForUser(ctx, row.UserID,
		`INSERT INTO Transaction
		        ( iid,  userId,  timestamp,  note,  type,  vendor,  payer,  categoryId,  tripId,  supersedesId)
		 VALUES (:iid, :userId, :timestamp, :note, :type, :vendor, :payer, :categoryId, :tripId, :supersedesId)`,
		row)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// InsertEntryLines writes the supplied entry lines against
// transactionID.
func InsertEntryLines(ctx context.Context, tx *userdb.Tx, userID int32, transactionID int64, lines []model.EntryLine) error {
	if len(lines) == 0 {
		return nil
	}
	rows := make([]model.EntryLine, len(lines))
	for i, l := range lines {
		l.TransactionID = int32(transactionID)
		rows[i] = l
	}
	_, err := tx.NamedExecForUser(ctx, userID,
		`INSERT INTO EntryLine
		        ( userId,  transactionId,  ledgerAccountId,  currencyCode,  stockId,  amountNanos)
		 VALUES (:userId, :transactionId, :ledgerAccountId, :currencyCode, :stockId, :amountNanos)`,
		rows)
	return err
}

// InsertLink writes a TransactionLink row connecting sourceID to
// linkedID with the given link type (refund or debt settlement).
func InsertLink(ctx context.Context, tx *userdb.Tx, userID int32, sourceID, linkedID int32, linkType model.TransactionLinkType) error {
	_, err := tx.NamedExecForUser(ctx, userID,
		`INSERT INTO TransactionLink
		        ( userId,  sourceTransactionId,  linkedTransactionId,  linkType)
		 VALUES (:userId, :sourceTransactionId, :linkedTransactionId, :linkType)`,
		model.TransactionLink{
			SourceTransactionID: sourceID,
			LinkedTransactionID: linkedID,
			LinkType:            linkType,
		})
	return err
}

// InsertSplit records the split context for a transaction with one or
// more companions: how much the companion owes (companionShareNanos)
// and how much they paid.
func InsertSplit(ctx context.Context, tx *userdb.Tx, userID int32, transactionID int64, companionName string, companionShareNanos, companionPaidNanos int64) error {
	row := model.SplitContext{
		TransactionID:       int32(transactionID),
		CompanionName:       companionName,
		CompanionShareNanos: companionShareNanos,
		CompanionPaidNanos:  companionPaidNanos,
	}
	_, err := tx.NamedExecForUser(ctx, userID,
		`INSERT INTO SplitContext
		        ( userId,  transactionId,  companionName,  companionShareNanos,  companionPaidNanos)
		 VALUES (:userId, :transactionId, :companionName, :companionShareNanos, :companionPaidNanos)`,
		row)
	return err
}

// ChainHead returns the head of a supersedes chain — the row that no
// other row in the slice points to. There must be exactly one head
// per chain; any other count is a data integrity error.
func ChainHead(txs []model.Transaction) (model.Transaction, error) {
	superseded := map[int32]bool{}
	for _, t := range txs {
		if t.SupersedesID != nil {
			superseded[*t.SupersedesID] = true
		}
	}
	heads := make([]model.Transaction, 0, 1)
	for _, t := range txs {
		if !superseded[t.ID] {
			heads = append(heads, t)
		}
	}
	if len(heads) != 1 {
		headIDs := make([]int32, 0, len(heads))
		for _, h := range heads {
			headIDs = append(headIDs, h.ID)
		}
		txIDs := make([]int32, 0, len(txs))
		for _, t := range txs {
			txIDs = append(txIDs, t.ID)
		}
		return model.Transaction{}, fmt.Errorf("expected 1 latest transaction, found %d (heads: %v, chain: %v)",
			len(heads), headIDs, txIDs)
	}
	return heads[0], nil
}

// AllocateIID returns the per-user incrementing identifier for a new
// transaction row. Edits copy the iid from the row they supersede;
// fresh transactions allocate maxIID+1 within the user.
func AllocateIID(ctx context.Context, tx *userdb.Tx, userID int32, supersedesID *int32) (int32, error) {
	if supersedesID != nil {
		var iid int32
		err := tx.GetForUser(ctx, &iid, userID,
			`SELECT iid
			   FROM Transaction
			  WHERE id     = :id
			    AND userId = :userId`,
			map[string]any{"id": *supersedesID})
		if err != nil {
			return 0, err
		}
		return iid, nil
	}
	var maxIID sql.NullInt32
	if err := tx.GetForUser(ctx, &maxIID, userID,
		`SELECT MAX(iid)
		   FROM Transaction
		  WHERE userId = :userId`); err != nil {
		return 0, err
	}
	return maxIID.Int32 + 1, nil
}
