package txform

import (
	"context"
	"errors"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger/common"
	"prosper/model"
	"prosper/userdb"
)

func writeTransfer(ctx context.Context, tx *userdb.Tx, userID int32, req *prosperv1.WriteTransactionFormRequest, iid int32, accts *[]model.LedgerAccount, t *prosperv1.TransferFormInput) (int64, error) {
	if t == nil {
		return 0, errors.New("transfer form required")
	}
	if t.Timestamp == nil {
		return 0, errors.New("transfer.timestamp required")
	}
	fromAsset, err := common.MustFindAsset(*accts, t.FromAccountId)
	if err != nil {
		return 0, err
	}
	toAsset, err := common.MustFindAsset(*accts, t.ToAccountId)
	if err != nil {
		return 0, err
	}
	fromUnit, err := common.LoadBankAccountUnit(ctx, tx, userID, t.FromAccountId)
	if err != nil {
		return 0, err
	}
	toUnit, err := common.LoadBankAccountUnit(ctx, tx, userID, t.ToAccountId)
	if err != nil {
		return 0, err
	}
	lines, err := buildTransferLines(*accts, fromAsset, toAsset, fromUnit, toUnit, t)
	if err != nil {
		return 0, err
	}
	row := model.Transaction{
		UserID:       userID,
		IID:          iid,
		Timestamp:    t.Timestamp.AsTime(),
		Note:         t.Description,
		Type:         model.TransactionTransfer,
		CategoryID:   t.CategoryId,
		SupersedesID: req.TransactionIdToSupersede,
	}
	newID, err := common.InsertTransactionRow(ctx, tx, row)
	if err != nil {
		return 0, err
	}
	if err := common.InsertEntryLines(ctx, tx, userID, newID, lines); err != nil {
		return 0, err
	}
	return newID, nil
}

// buildTransferLines returns the entry lines for a transfer. When the
// two sides share a unit it's a single-currency transfer (two lines);
// otherwise the CURRENCY_EXCHANGE ledger account is used as the
// intermediary so the books stay balanced per currency.
func buildTransferLines(accts []model.LedgerAccount, fromAsset, toAsset model.LedgerAccount, fromUnit, toUnit model.Unit, t *prosperv1.TransferFormInput) ([]model.EntryLine, error) {
	if fromUnit.Matches(toUnit) {
		return []model.EntryLine{
			{LedgerAccountID: fromAsset.ID, CurrencyCode: fromUnit.CurrencyCode, StockID: fromUnit.StockID, AmountNanos: -t.AmountSentNanos},
			{LedgerAccountID: toAsset.ID, CurrencyCode: toUnit.CurrencyCode, StockID: toUnit.StockID, AmountNanos: t.AmountReceivedNanos},
		}, nil
	}
	fx, err := common.MustFindByType(accts, model.LedgerAccountCurrencyExchange)
	if err != nil {
		return nil, err
	}
	return []model.EntryLine{
		{LedgerAccountID: fromAsset.ID, CurrencyCode: fromUnit.CurrencyCode, StockID: fromUnit.StockID, AmountNanos: -t.AmountSentNanos},
		{LedgerAccountID: fx.ID, CurrencyCode: fromUnit.CurrencyCode, StockID: fromUnit.StockID, AmountNanos: t.AmountSentNanos},
		{LedgerAccountID: fx.ID, CurrencyCode: toUnit.CurrencyCode, StockID: toUnit.StockID, AmountNanos: -t.AmountReceivedNanos},
		{LedgerAccountID: toAsset.ID, CurrencyCode: toUnit.CurrencyCode, StockID: toUnit.StockID, AmountNanos: t.AmountReceivedNanos},
	}, nil
}
