package ledger

import (
	"context"
	"errors"
	"fmt"

	"prosper/auth"
	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger/common"
	"prosper/model"
	"prosper/userdb"
)

func (s *Service) UpsertBank(ctx context.Context, req *prosperv1.UpsertBankRequest) (*prosperv1.UpsertBankResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	if req.Bank == nil {
		return nil, errors.New("bank required")
	}
	row := model.Bank{
		ID:           req.Bank.Id,
		UserID:       userID,
		Name:         req.Bank.Name,
		DisplayOrder: req.Bank.DisplayOrder,
	}
	id, err := s.upsertBank(ctx, row)
	if err != nil {
		return nil, err
	}
	return &prosperv1.UpsertBankResponse{BankId: id}, nil
}

func (s *Service) upsertBank(ctx context.Context, row model.Bank) (int32, error) {
	if row.ID != 0 {
		if _, err := s.db.NamedExecForUser(ctx, row.UserID,
			`UPDATE Bank
			    SET name         = :name,
			        displayOrder = :displayOrder
			  WHERE id     = :id
			    AND userId = :userId`,
			row); err != nil {
			return 0, err
		}
		return row.ID, nil
	}
	res, err := s.db.NamedExecForUser(ctx, row.UserID,
		`INSERT INTO Bank
		        ( userId,  name,  displayOrder)
		 VALUES (:userId, :name, :displayOrder)`,
		row)
	if err != nil {
		return 0, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}
	return int32(id), nil
}

func (s *Service) UpsertBankAccount(ctx context.Context, req *prosperv1.UpsertBankAccountRequest) (*prosperv1.UpsertBankAccountResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	if req.Name == "" {
		return nil, errors.New("name required")
	}
	if req.BankId == 0 {
		return nil, errors.New("bank_id required")
	}

	tx, err := s.db.BeginTx(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	unit, err := s.resolveAccountUnit(ctx, tx, userID, req)
	if err != nil {
		return nil, err
	}

	newCurrencyBeingAdded, err := isNewCurrency(ctx, tx, unit)
	if err != nil {
		return nil, err
	}

	bankAccount := model.BankAccount{
		UserID:              userID,
		Name:                req.Name,
		BankID:              req.BankId,
		CurrencyCode:        unit.CurrencyCode,
		StockID:             unit.StockID,
		Joint:               req.Joint,
		Archived:            req.Archived,
		DisplayOrder:        req.DisplayOrder,
		InitialBalanceCents: req.InitialBalanceCents,
	}
	if req.AccountId != nil {
		bankAccount.ID = *req.AccountId
	}
	id, err := writeBankAccountRow(ctx, tx, bankAccount)
	if err != nil {
		return nil, err
	}
	if err := syncOpeningBalance(ctx, tx, userID, id, unit, req.InitialBalanceCents); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	if newCurrencyBeingAdded {
		s.rateTrigger.TriggerFetch()
	}
	return &prosperv1.UpsertBankAccountResponse{AccountId: id}, nil
}

// isNewCurrency reports whether the supplied unit introduces a
// currency the user has never used before.
func isNewCurrency(ctx context.Context, tx *userdb.Tx, unit model.Unit) (bool, error) {
	if unit.CurrencyCode == nil {
		return false, nil
	}
	var n int
	err := tx.Raw().GetContext(ctx, &n,
		`SELECT COUNT(*) FROM ExchangeRate WHERE currencyCodeFrom = ? OR currencyCodeTo = ?`,
		*unit.CurrencyCode, *unit.CurrencyCode)
	if err != nil {
		return false, err
	}
	return n == 0, nil
}

// writeBankAccountRow inserts or updates the supplied BankAccount row
// and the mirroring ASSET ledger account, returning the bank account
// id.
func writeBankAccountRow(ctx context.Context, tx *userdb.Tx, bankAccount model.BankAccount) (int32, error) {
	if bankAccount.ID != 0 {
		return updateBankAccountRow(ctx, tx, bankAccount)
	}
	return insertBankAccountRow(ctx, tx, bankAccount)
}

func updateBankAccountRow(ctx context.Context, tx *userdb.Tx, bankAccount model.BankAccount) (int32, error) {
	if _, err := tx.NamedExecForUser(ctx, bankAccount.UserID,
		`UPDATE BankAccount
		    SET name                = :name,
		        bankId              = :bankId,
		        joint               = :joint,
		        archived            = :archived,
		        displayOrder        = :displayOrder,
		        initialBalanceCents = :initialBalanceCents
		  WHERE id     = :id
		    AND userId = :userId`,
		bankAccount); err != nil {
		return 0, err
	}
	ledgerAcc := model.LedgerAccount{
		UserID:        bankAccount.UserID,
		Name:          bankAccount.Name,
		BankAccountID: &bankAccount.ID,
	}
	if _, err := tx.NamedExecForUser(ctx, ledgerAcc.UserID,
		`UPDATE LedgerAccount
		    SET name = :name
		  WHERE bankAccountId = :bankAccountId
		    AND userId        = :userId`,
		ledgerAcc); err != nil {
		return 0, err
	}
	return bankAccount.ID, nil
}

func insertBankAccountRow(ctx context.Context, tx *userdb.Tx, bankAccount model.BankAccount) (int32, error) {
	res, err := tx.NamedExecForUser(ctx, bankAccount.UserID,
		`INSERT INTO BankAccount
		        ( userId,  name,  bankId,  currencyCode,  stockId,  joint,  archived,  displayOrder,  initialBalanceCents)
		 VALUES (:userId, :name, :bankId, :currencyCode, :stockId, :joint, :archived, :displayOrder, :initialBalanceCents)`,
		bankAccount)
	if err != nil {
		return 0, err
	}
	rawID, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}
	id := int32(rawID)
	ledgerAcc := model.LedgerAccount{
		UserID:        bankAccount.UserID,
		Name:          bankAccount.Name,
		Type:          model.LedgerAccountAsset,
		BankAccountID: &id,
	}
	if _, err := tx.NamedExecForUser(ctx, ledgerAcc.UserID,
		`INSERT INTO LedgerAccount
		        ( userId,  name,  type,  bankAccountId)
		 VALUES (:userId, :name, :type, :bankAccountId)`,
		ledgerAcc); err != nil {
		return 0, err
	}
	return id, nil
}

// resolveAccountUnit returns the bank account unit, enforcing that
// existing accounts may not change their unit.
func (s *Service) resolveAccountUnit(ctx context.Context, tx *userdb.Tx, userID int32, req *prosperv1.UpsertBankAccountRequest) (model.Unit, error) {
	if req.Unit == nil || req.Unit.Unit == nil {
		return model.Unit{}, errors.New("unit required")
	}
	newUnit, err := s.materializeUnit(ctx, req.Unit)
	if err != nil {
		return model.Unit{}, err
	}
	if req.AccountId == nil {
		return newUnit, nil
	}
	existing, err := common.LoadBankAccountUnit(ctx, tx, userID, *req.AccountId)
	if err != nil {
		return model.Unit{}, err
	}
	if !existing.Matches(newUnit) {
		return model.Unit{}, errors.New("bank account unit cannot be changed")
	}
	return existing, nil
}

// materializeUnit converts the proto AccountUnit into a Unit,
// resolving new_stock specs through the StockResolver.
func (s *Service) materializeUnit(ctx context.Context, u *prosperv1.AccountUnit) (model.Unit, error) {
	switch v := u.Unit.(type) {
	case *prosperv1.AccountUnit_CurrencyCode:
		code := v.CurrencyCode
		return model.NewUnit(&code, nil)
	case *prosperv1.AccountUnit_StockId:
		id := v.StockId
		return model.NewUnit(nil, &id)
	case *prosperv1.AccountUnit_NewStock:
		stockID, err := s.stockResolver.ResolveOrCreate(ctx, v.NewStock.Exchange, v.NewStock.Ticker)
		if err != nil {
			return model.Unit{}, fmt.Errorf("resolve stock %s/%s: %w", v.NewStock.Exchange, v.NewStock.Ticker, err)
		}
		return model.NewUnit(nil, &stockID)
	default:
		return model.Unit{}, fmt.Errorf("unsupported account unit %T", v)
	}
}
