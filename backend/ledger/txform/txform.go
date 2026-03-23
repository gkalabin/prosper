// Package txform owns the write path for the LedgerService transaction forms (expense, income, transfer).
package txform

import (
	"context"
	"errors"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger/common"
	"prosper/model"
	"prosper/userdb"
)

// Write processes a transaction-form submission inside a single DB
// transaction. Returns the new transaction's id.
func Write(ctx context.Context, db *userdb.DB, userID int32, req *prosperv1.WriteTransactionFormRequest) (int32, error) {
	tx, err := db.BeginTx(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	ledgerAccounts, err := common.LoadLedgerAccounts(ctx, tx, userID)
	if err != nil {
		return 0, err
	}
	iid, err := common.AllocateIID(ctx, tx, userID, req.TransactionIdToSupersede)
	if err != nil {
		return 0, err
	}

	var newID int64
	switch f := req.Form.(type) {
	case *prosperv1.WriteTransactionFormRequest_Expense:
		newID, err = writeExpense(ctx, tx, userID, req, iid, &ledgerAccounts, f.Expense)
	case *prosperv1.WriteTransactionFormRequest_Income:
		newID, err = writeIncome(ctx, tx, userID, req, iid, &ledgerAccounts, f.Income)
	case *prosperv1.WriteTransactionFormRequest_Transfer:
		newID, err = writeTransfer(ctx, tx, userID, req, iid, &ledgerAccounts, f.Transfer)
	default:
		return 0, errors.New("form variant required")
	}
	if err != nil {
		return 0, err
	}

	if err := writeTags(ctx, tx, userID, newID, req.TagNames); err != nil {
		return 0, err
	}
	if err := writeUsedProtos(ctx, tx, userID, newID, req.UsedProtos); err != nil {
		return 0, err
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return int32(newID), nil
}

// writeUsedProtos records each external prototype consumed by a
// transaction submission against the new transaction id.
func writeUsedProtos(ctx context.Context, tx *userdb.Tx, userID int32, transactionID int64, protos []*prosperv1.TransactionPrototypeInput) error {
	if len(protos) == 0 {
		return nil
	}
	rows := make([]model.TransactionPrototype, len(protos))
	for i, p := range protos {
		rows[i] = model.TransactionPrototype{
			InternalTransactionID: int32(transactionID),
			ExternalID:            p.ExternalId,
			ExternalDescription:   p.ExternalDescription,
		}
	}
	_, err := tx.NamedExecForUser(ctx, userID,
		`INSERT INTO TransactionPrototype
		        ( userId,  internalTransactionId,  externalId,  externalDescription)
		 VALUES (:userId, :internalTransactionId, :externalId, :externalDescription)`,
		rows)
	return err
}
