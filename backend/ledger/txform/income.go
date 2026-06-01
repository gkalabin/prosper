package txform

import (
	"context"
	"errors"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger/common"
	"prosper/model"
	"prosper/userdb"
)

func writeIncome(ctx context.Context, tx *userdb.Tx, userID int32, req *prosperv1.WriteTransactionFormRequest, iid int32, accts *[]model.LedgerAccount, in *prosperv1.IncomeFormInput) (int64, error) {
	if in == nil {
		return 0, errors.New("income form required")
	}
	if in.Timestamp == nil {
		return 0, errors.New("income.timestamp required")
	}
	asset, err := common.MustFindAsset(*accts, in.AccountId)
	if err != nil {
		return 0, err
	}
	incomeAcc, err := common.MustFindByType(*accts, model.LedgerAccountIncome)
	if err != nil {
		return 0, err
	}
	unit, err := common.LoadBankAccountUnit(ctx, tx, userID, in.AccountId)
	if err != nil {
		return 0, err
	}

	var lines []model.EntryLine
	if in.IsShared {
		lines, err = buildSharedIncomeLines(ctx, tx, userID, accts, in, asset, incomeAcc, unit)
	} else {
		lines = buildSoloIncomeLines(in, asset, incomeAcc, unit)
	}
	if err != nil {
		return 0, err
	}

	payer := in.Payer
	categoryID := in.CategoryId
	row := model.Transaction{
		UserID:       userID,
		IID:          iid,
		Timestamp:    in.Timestamp.AsTime(),
		Note:         in.Description,
		Type:         model.TransactionIncome,
		Payer:        &payer,
		CategoryID:   &categoryID,
		SupersedesID: req.TransactionIdToSupersede,
	}
	newID, err := common.InsertTransactionRow(ctx, tx, row)
	if err != nil {
		return 0, err
	}
	if err := common.InsertEntryLines(ctx, tx, userID, newID, lines); err != nil {
		return 0, err
	}
	if in.IsShared {
		if in.Companion == nil {
			return 0, errors.New("companion required for shared income")
		}
		companionShare := in.AmountNanos - in.OwnShareNanos
		if err := common.InsertSplit(ctx, tx, userID, newID, *in.Companion, companionShare, 0); err != nil {
			return 0, err
		}
	}
	if in.ParentTransactionId != nil {
		if err := common.InsertLink(ctx, tx, userID, *in.ParentTransactionId, int32(newID), model.LinkRefund); err != nil {
			return 0, err
		}
	}
	return newID, nil
}

// buildSoloIncomeLines returns the two entry lines for a non-shared
// income: the full amount lands in the asset, the same amount is
// counted as income.
func buildSoloIncomeLines(in *prosperv1.IncomeFormInput, asset, incomeAcc model.LedgerAccount, unit model.Unit) []model.EntryLine {
	return []model.EntryLine{
		{LedgerAccountID: asset.ID, CurrencyCode: unit.CurrencyCode, StockExchange: unit.StockExchange, StockTicker: unit.StockTicker, AmountNanos: in.AmountNanos},
		{LedgerAccountID: incomeAcc.ID, CurrencyCode: unit.CurrencyCode, StockExchange: unit.StockExchange, StockTicker: unit.StockTicker, AmountNanos: -in.AmountNanos},
	}
}

// buildSharedIncomeLines returns the three entry lines for a shared
// income: the full amount in the asset, only the user's share counted
// as income, and the companion's share as a credit to the matching
// RECEIVABLE account so the books reflect what's owed back.
func buildSharedIncomeLines(ctx context.Context, tx *userdb.Tx, userID int32, accts *[]model.LedgerAccount, in *prosperv1.IncomeFormInput, asset, incomeAcc model.LedgerAccount, unit model.Unit) ([]model.EntryLine, error) {
	if in.Companion == nil {
		return nil, errors.New("companion required for shared income")
	}
	companionShare := in.AmountNanos - in.OwnShareNanos
	recv, err := common.GetOrCreateReceivable(ctx, tx, userID, accts, *in.Companion)
	if err != nil {
		return nil, err
	}
	return []model.EntryLine{
		{LedgerAccountID: asset.ID, CurrencyCode: unit.CurrencyCode, StockExchange: unit.StockExchange, StockTicker: unit.StockTicker, AmountNanos: in.AmountNanos},
		{LedgerAccountID: incomeAcc.ID, CurrencyCode: unit.CurrencyCode, StockExchange: unit.StockExchange, StockTicker: unit.StockTicker, AmountNanos: -in.OwnShareNanos},
		{LedgerAccountID: recv.ID, CurrencyCode: unit.CurrencyCode, StockExchange: unit.StockExchange, StockTicker: unit.StockTicker, AmountNanos: -companionShare},
	}, nil
}
