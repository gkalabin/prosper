package txform

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger/common"
	"prosper/model"
	"prosper/userdb"
)

// repaymentNote renders the auto-populated note for a settlement transaction.
func repaymentNote(payee string) string {
	return "Paid back for " + payee
}

// expenseTransactionType returns the wire transaction type for the
// given sharing flavor. PAID_SELF_* records as a regular expense the
// user paid for themselves; PAID_OTHER_* is recorded as
// THIRD_PARTY_EXPENSE because someone else paid the merchant.
func expenseTransactionType(st prosperv1.SharingType) (model.TransactionType, error) {
	switch st {
	case prosperv1.SharingType_SHARING_TYPE_PAID_SELF_NOT_SHARED, prosperv1.SharingType_SHARING_TYPE_PAID_SELF_SHARED:
		return model.TransactionExpense, nil
	case prosperv1.SharingType_SHARING_TYPE_PAID_OTHER_OWED, prosperv1.SharingType_SHARING_TYPE_PAID_OTHER_REPAID:
		return model.TransactionThirdPartyExpense, nil
	default:
		return "", fmt.Errorf("invalid sharing type %v", st)
	}
}

func writeExpense(ctx context.Context, tx *userdb.Tx, userID int32, req *prosperv1.WriteTransactionFormRequest, iid int32, accts *[]model.LedgerAccount, e *prosperv1.ExpenseFormInput) (int64, error) {
	if e == nil {
		return 0, errors.New("expense form required")
	}
	if e.Timestamp == nil {
		return 0, errors.New("expense.timestamp required")
	}

	txType, err := expenseTransactionType(e.SharingType)
	if err != nil {
		return 0, err
	}

	lines, err := buildExpenseLines(ctx, tx, userID, accts, e)
	if err != nil {
		return 0, err
	}

	tripID, err := common.GetOrCreateTrip(ctx, tx, userID, e.TripName)
	if err != nil {
		return 0, err
	}

	var payer *string
	if txType == model.TransactionThirdPartyExpense {
		payer = e.Payer
	}

	vendor := e.Vendor
	categoryID := e.CategoryId
	row := model.Transaction{
		UserID:       userID,
		IID:          iid,
		Timestamp:    e.Timestamp.AsTime(),
		Note:         e.Description,
		Type:         txType,
		Vendor:       &vendor,
		Payer:        payer,
		CategoryID:   &categoryID,
		TripID:       tripID,
		SupersedesID: req.TransactionIdToSupersede,
	}
	newID, err := common.InsertTransactionRow(ctx, tx, row)
	if err != nil {
		return 0, err
	}
	if err := common.InsertEntryLines(ctx, tx, userID, newID, lines); err != nil {
		return 0, err
	}
	if err := writeExpenseSplits(ctx, tx, userID, newID, e); err != nil {
		return 0, err
	}
	if e.SharingType == prosperv1.SharingType_SHARING_TYPE_PAID_OTHER_REPAID {
		if err := writeRepayment(ctx, tx, userID, req, accts, newID, e); err != nil {
			return 0, err
		}
	}
	return newID, nil
}

func buildExpenseLines(ctx context.Context, tx *userdb.Tx, userID int32, accts *[]model.LedgerAccount, e *prosperv1.ExpenseFormInput) ([]model.EntryLine, error) {
	switch e.SharingType {
	case prosperv1.SharingType_SHARING_TYPE_PAID_SELF_NOT_SHARED, prosperv1.SharingType_SHARING_TYPE_PAID_SELF_SHARED:
		return buildPaidSelfLines(ctx, tx, userID, accts, e)
	case prosperv1.SharingType_SHARING_TYPE_PAID_OTHER_OWED, prosperv1.SharingType_SHARING_TYPE_PAID_OTHER_REPAID:
		return buildThirdPartyLines(ctx, tx, userID, accts, e)
	default:
		return nil, fmt.Errorf("invalid sharing type %v", e.SharingType)
	}
}

// buildPaidSelfLines returns the entry lines for an expense the user
// paid for themselves. Non-shared expenses produce two lines (asset
// out, expense in). Shared expenses produce three (asset out, the
// user's own share into expense, the companion's share into a
// RECEIVABLE so the books reflect what is owed back).
func buildPaidSelfLines(ctx context.Context, tx *userdb.Tx, userID int32, accts *[]model.LedgerAccount, e *prosperv1.ExpenseFormInput) ([]model.EntryLine, error) {
	if e.AccountId == nil {
		return nil, errors.New("account_id required for paid_self expense")
	}
	asset, err := common.MustFindAsset(*accts, *e.AccountId)
	if err != nil {
		return nil, err
	}
	expenseAcc, err := common.MustFindByType(*accts, model.LedgerAccountExpense)
	if err != nil {
		return nil, err
	}
	unit, err := common.LoadBankAccountUnit(ctx, tx, userID, *e.AccountId)
	if err != nil {
		return nil, err
	}
	lines := []model.EntryLine{
		{LedgerAccountID: asset.ID, CurrencyCode: unit.CurrencyCode, StockID: unit.StockID, AmountNanos: -e.AmountNanos},
	}
	if e.SharingType == prosperv1.SharingType_SHARING_TYPE_PAID_SELF_NOT_SHARED {
		lines = append(lines, model.EntryLine{
			LedgerAccountID: expenseAcc.ID,
			CurrencyCode:    unit.CurrencyCode,
			StockID:         unit.StockID,
			AmountNanos:     e.AmountNanos,
		})
		return lines, nil
	}
	if e.Companion == nil {
		return nil, errors.New("companion required for shared expense")
	}
	receivable, err := common.GetOrCreateReceivable(ctx, tx, userID, accts, *e.Companion)
	if err != nil {
		return nil, err
	}
	companionShare := e.AmountNanos - e.OwnShareNanos
	lines = append(lines,
		model.EntryLine{LedgerAccountID: expenseAcc.ID, CurrencyCode: unit.CurrencyCode, StockID: unit.StockID, AmountNanos: e.OwnShareNanos},
		model.EntryLine{LedgerAccountID: receivable.ID, CurrencyCode: unit.CurrencyCode, StockID: unit.StockID, AmountNanos: companionShare},
	)
	return lines, nil
}

func buildThirdPartyLines(ctx context.Context, tx *userdb.Tx, userID int32, accts *[]model.LedgerAccount, e *prosperv1.ExpenseFormInput) ([]model.EntryLine, error) {
	if e.Currency == nil {
		return nil, errors.New("currency required for third_party expense")
	}
	if e.Payer == nil {
		return nil, errors.New("payer required for third_party expense")
	}
	expenseAcc, err := common.MustFindByType(*accts, model.LedgerAccountExpense)
	if err != nil {
		return nil, err
	}
	receivable, err := common.GetOrCreateReceivable(ctx, tx, userID, accts, *e.Payer)
	if err != nil {
		return nil, err
	}
	currency := *e.Currency
	return []model.EntryLine{
		{LedgerAccountID: expenseAcc.ID, CurrencyCode: &currency, AmountNanos: e.OwnShareNanos},
		{LedgerAccountID: receivable.ID, CurrencyCode: &currency, AmountNanos: -e.OwnShareNanos},
	}, nil
}

func writeExpenseSplits(ctx context.Context, tx *userdb.Tx, userID int32, transactionID int64, e *prosperv1.ExpenseFormInput) error {
	switch e.SharingType {
	case prosperv1.SharingType_SHARING_TYPE_PAID_SELF_NOT_SHARED:
		return nil
	case prosperv1.SharingType_SHARING_TYPE_PAID_SELF_SHARED:
		if e.Companion == nil {
			return errors.New("companion required for shared expense")
		}
		return common.InsertSplit(ctx, tx, userID, transactionID, *e.Companion, e.AmountNanos-e.OwnShareNanos, 0)
	case prosperv1.SharingType_SHARING_TYPE_PAID_OTHER_OWED, prosperv1.SharingType_SHARING_TYPE_PAID_OTHER_REPAID:
		if e.Payer == nil {
			return errors.New("payer required for third_party expense")
		}
		return common.InsertSplit(ctx, tx, userID, transactionID, *e.Payer, e.AmountNanos-e.OwnShareNanos, e.AmountNanos)
	}
	return nil
}

// writeRepayment records the settlement transaction (the user paying
// the third-party payer back) that accompanies a SHARING_TYPE_PAID_OTHER_REPAID
// expense, and links the two with a DEBT_SETTLING TransactionLink.
func writeRepayment(ctx context.Context, tx *userdb.Tx, userID int32, req *prosperv1.WriteTransactionFormRequest, accts *[]model.LedgerAccount, sourceTxID int64, e *prosperv1.ExpenseFormInput) error {
	if e.Repayment == nil {
		return errors.New("repayment required for SHARING_TYPE_PAID_OTHER_REPAID")
	}
	if e.Payer == nil {
		return errors.New("payer required for SHARING_TYPE_PAID_OTHER_REPAID")
	}
	if e.Repayment.Timestamp == nil {
		return errors.New("repayment.timestamp required")
	}
	asset, err := common.MustFindAsset(*accts, e.Repayment.AccountId)
	if err != nil {
		return err
	}
	receivable, err := common.GetOrCreateReceivable(ctx, tx, userID, accts, *e.Payer)
	if err != nil {
		return err
	}
	unit, err := common.LoadBankAccountUnit(ctx, tx, userID, e.Repayment.AccountId)
	if err != nil {
		return err
	}

	supersedesID, repaymentIID, err := repaymentSupersedes(ctx, tx, userID, req.TransactionIdToSupersede)
	if err != nil {
		return err
	}

	vendor := *e.Payer
	categoryID := e.Repayment.CategoryId
	row := model.Transaction{
		UserID:       userID,
		IID:          repaymentIID,
		Timestamp:    e.Repayment.Timestamp.AsTime(),
		Note:         repaymentNote(e.Vendor),
		Type:         model.TransactionExpense,
		Vendor:       &vendor,
		CategoryID:   &categoryID,
		SupersedesID: supersedesID,
	}
	repaymentID, err := common.InsertTransactionRow(ctx, tx, row)
	if err != nil {
		return err
	}
	lines := []model.EntryLine{
		{LedgerAccountID: asset.ID, CurrencyCode: unit.CurrencyCode, StockID: unit.StockID, AmountNanos: -e.OwnShareNanos},
		{LedgerAccountID: receivable.ID, CurrencyCode: unit.CurrencyCode, StockID: unit.StockID, AmountNanos: e.OwnShareNanos},
	}
	if err := common.InsertEntryLines(ctx, tx, userID, repaymentID, lines); err != nil {
		return err
	}
	return common.InsertLink(ctx, tx, userID, int32(sourceTxID), int32(repaymentID), model.LinkDebtSettling)
}

// repaymentSupersedes returns (supersedesID, iid) for the repayment
// transaction.
//
// When the parent expense is being edited (parentSupersedesID != nil)
// and that prior expense already had a linked DEBT_SETTLING repayment,
// the new repayment supersedes that older one — reusing both its iid
// (for stable user-facing references) and its row id (so the chain
// stays linkable).
//
// In every other case (fresh expense, or edit of an expense that
// didn't have a repayment yet) a new iid is allocated.
func repaymentSupersedes(ctx context.Context, tx *userdb.Tx, userID int32, parentSupersedesID *int32) (*int32, int32, error) {
	if parentSupersedesID == nil {
		iid, err := common.AllocateIID(ctx, tx, userID, nil)
		if err != nil {
			return nil, 0, err
		}
		return nil, iid, nil
	}
	var oldRepaymentID int32
	err := tx.Raw().GetContext(ctx, &oldRepaymentID,
		`SELECT linkedTransactionId
		   FROM TransactionLink
		  WHERE sourceTransactionId = ?
		    AND linkType            = 'DEBT_SETTLING'
		  LIMIT 1`,
		*parentSupersedesID)
	if errors.Is(err, sql.ErrNoRows) {
		iid, err := common.AllocateIID(ctx, tx, userID, nil)
		if err != nil {
			return nil, 0, err
		}
		return nil, iid, nil
	}
	if err != nil {
		return nil, 0, err
	}
	var iid int32
	if err := tx.GetForUser(ctx, &iid, userID,
		`SELECT iid
		   FROM Transaction
		  WHERE id     = :id
		    AND userId = :userId`,
		map[string]any{"id": oldRepaymentID}); err != nil {
		return nil, 0, err
	}
	return &oldRepaymentID, iid, nil
}
