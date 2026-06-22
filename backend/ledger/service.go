package ledger

import (
	"context"
	"errors"
	"fmt"
	"log"

	"prosper/auth"
	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger/txform"
	"prosper/model"
	"prosper/suggest"
	"prosper/userdb"
)

// RateTrigger lets the ledger service kick off an out-of-band rate
// fetch (e.g. when UpsertBankAccount introduces a new currency, or
// UpdateDisplaySettings changes the conversion target).
type RateTrigger interface {
	TriggerFetch()
}

// StockResolver guarantees a Stock row exists for the given
// (exchange, ticker), creating one when no match exists.
type StockResolver interface {
	EnsureStock(ctx context.Context, exchange, ticker string) error
}

type Service struct {
	prosperv1.UnimplementedLedgerServiceServer
	db            *userdb.DB
	rateTrigger   RateTrigger
	stockResolver StockResolver
	suggester     *suggest.Pipeline
}

// NewService constructs a Service. All dependencies are required.
func NewService(db *userdb.DB, rt RateTrigger, sr StockResolver, sp *suggest.Pipeline) *Service {
	if rt == nil {
		panic("ledger: RateTrigger is required")
	}
	if sr == nil {
		panic("ledger: StockResolver is required")
	}
	if sp == nil {
		panic("ledger: suggestion Pipeline is required")
	}
	return &Service{
		db:            db,
		rateTrigger:   rt,
		stockResolver: sr,
		suggester:     sp,
	}
}

// Suggest proposes transaction drafts for the events the suggestion
// pipeline knows about.
func (s *Service) Suggest(ctx context.Context, _ *prosperv1.SuggestRequest) (*prosperv1.SuggestResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	drafts, err := s.suggester.Suggest(ctx, userID)
	if err != nil {
		return nil, err
	}
	return &prosperv1.SuggestResponse{Drafts: drafts}, nil
}

func (s *Service) GetCoreData(ctx context.Context, _ *prosperv1.GetCoreDataRequest) (*prosperv1.GetCoreDataResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	resp := &prosperv1.GetCoreDataResponse{}

	var banks []model.Bank
	if err := s.db.SelectForUser(ctx, &banks, userID,
		`SELECT * FROM Bank WHERE userId = :userId ORDER BY displayOrder, id`); err != nil {
		return nil, err
	}
	for i := range banks {
		resp.Banks = append(resp.Banks, bankToProto(&banks[i]))
	}

	var bankAccounts []model.BankAccount
	if err := s.db.SelectForUser(ctx, &bankAccounts, userID,
		`SELECT * FROM BankAccount WHERE userId = :userId ORDER BY displayOrder, id`); err != nil {
		return nil, err
	}
	for i := range bankAccounts {
		resp.BankAccounts = append(resp.BankAccounts, bankAccountToProto(&bankAccounts[i]))
	}

	var categories []model.Category
	if err := s.db.SelectForUser(ctx, &categories, userID,
		`SELECT * FROM Category WHERE userId = :userId ORDER BY displayOrder, id`); err != nil {
		return nil, err
	}
	for i := range categories {
		resp.Categories = append(resp.Categories, categoryToProto(&categories[i]))
	}

	var tags []model.Tag
	if err := s.db.SelectForUser(ctx, &tags, userID,
		`SELECT * FROM Tag WHERE userId = :userId ORDER BY id`); err != nil {
		return nil, err
	}
	for i := range tags {
		resp.Tags = append(resp.Tags, tagToProto(&tags[i]))
	}

	var trips []model.Trip
	if err := s.db.SelectForUser(ctx, &trips, userID,
		`SELECT * FROM Trip WHERE userId = :userId ORDER BY id`); err != nil {
		return nil, err
	}
	for i := range trips {
		resp.Trips = append(resp.Trips, tripToProto(&trips[i]))
	}

	// Stocks are global (no userId filter).
	var stocks []model.Stock
	if err := s.db.Raw().SelectContext(ctx, &stocks, `SELECT * FROM Stock`); err != nil {
		return nil, err
	}
	for i := range stocks {
		resp.Stocks = append(resp.Stocks, stockToProto(&stocks[i]))
	}

	var ds model.DisplaySettings
	if err := s.db.GetForUser(ctx, &ds, userID,
		`SELECT * FROM DisplaySettings WHERE userId = :userId`); err != nil {
		return nil, fmt.Errorf("DisplaySettings missing for user %d: %w", userID, err)
	}
	resp.DisplaySettings = displaySettingsToProto(&ds)

	return resp, nil
}

func (s *Service) GetTransactions(ctx context.Context, _ *prosperv1.GetTransactionsRequest) (*prosperv1.GetTransactionsResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	resp := &prosperv1.GetTransactionsResponse{}

	if err := s.appendLedgerAccounts(ctx, userID, resp); err != nil {
		return nil, err
	}

	var txs []model.Transaction
	if err := s.db.SelectForUser(ctx, &txs, userID,
		`SELECT * FROM Transaction WHERE userId = :userId ORDER BY timestamp DESC, id DESC`); err != nil {
		return nil, err
	}
	if len(txs) == 0 {
		return resp, nil
	}

	txByID := make(map[int32]*prosperv1.Transaction, len(txs))
	for i := range txs {
		t := &txs[i]
		pt, err := transactionToProto(t)
		if err != nil {
			log.Printf("ledger: skipping transaction %d: %v", t.ID, err)
			continue
		}
		resp.Transactions = append(resp.Transactions, pt)
		txByID[t.ID] = pt
	}

	if err := s.attachEntryLines(ctx, userID, txByID); err != nil {
		return nil, err
	}
	if err := s.attachSplits(ctx, userID, txByID); err != nil {
		return nil, err
	}
	if err := s.attachTagIDs(ctx, userID, txByID); err != nil {
		return nil, err
	}
	if err := s.attachLinks(ctx, userID, resp); err != nil {
		return nil, err
	}

	return resp, nil
}

func (s *Service) attachEntryLines(ctx context.Context, userID int32, byID map[int32]*prosperv1.Transaction) error {
	var lines []model.EntryLine
	if err := s.db.SelectForUser(ctx, &lines, userID,
		`SELECT el.*
		 FROM EntryLine el
		 JOIN Transaction t ON t.id = el.transactionId
		 WHERE t.userId = :userId`); err != nil {
		return err
	}
	for i := range lines {
		l := &lines[i]
		pt, ok := byID[l.TransactionID]
		if !ok {
			log.Printf("ledger: entry line %d references unknown transaction %d", l.ID, l.TransactionID)
			continue
		}
		pt.Lines = append(pt.Lines, entryLineToProto(l))
	}
	return nil
}

func (s *Service) attachSplits(ctx context.Context, userID int32, byID map[int32]*prosperv1.Transaction) error {
	var splits []model.SplitContext
	if err := s.db.SelectForUser(ctx, &splits, userID,
		`SELECT sc.*
		 FROM SplitContext sc
		 JOIN Transaction t ON t.id = sc.transactionId
		 WHERE t.userId = :userId`); err != nil {
		return err
	}
	for i := range splits {
		sp := &splits[i]
		pt, ok := byID[sp.TransactionID]
		if !ok {
			log.Printf("ledger: split %d references unknown transaction %d", sp.ID, sp.TransactionID)
			continue
		}
		pt.Splits = append(pt.Splits, splitContextToProto(sp))
	}
	return nil
}

func (s *Service) attachTagIDs(ctx context.Context, userID int32, byID map[int32]*prosperv1.Transaction) error {
	var links []model.TagTransactionLink
	if err := s.db.SelectForUser(ctx, &links, userID,
		`SELECT tt.tagId, tt.transactionId FROM TagTransaction tt
		 JOIN Transaction t ON t.id = tt.transactionId
		 WHERE t.userId = :userId`); err != nil {
		return err
	}
	for _, l := range links {
		pt, ok := byID[l.TransactionID]
		if !ok {
			log.Printf("ledger: tag link references unknown transaction %d", l.TransactionID)
			continue
		}
		pt.TagIds = append(pt.TagIds, l.TagID)
	}
	return nil
}

func (s *Service) attachLinks(ctx context.Context, userID int32, resp *prosperv1.GetTransactionsResponse) error {
	var links []model.TransactionLink
	if err := s.db.SelectForUser(ctx, &links, userID,
		`SELECT tl.*
		 FROM TransactionLink tl
		 JOIN Transaction t ON t.id = tl.sourceTransactionId
		 WHERE t.userId = :userId`); err != nil {
		return err
	}
	for i := range links {
		l := &links[i]
		pl, err := transactionLinkToProto(l)
		if err != nil {
			log.Printf("ledger: skipping transaction link %d: %v", l.ID, err)
			continue
		}
		resp.Links = append(resp.Links, pl)
	}
	return nil
}

func (s *Service) appendLedgerAccounts(ctx context.Context, userID int32, resp *prosperv1.GetTransactionsResponse) error {
	var accts []model.LedgerAccount
	if err := s.db.SelectForUser(ctx, &accts, userID,
		`SELECT * FROM LedgerAccount WHERE userId = :userId`); err != nil {
		return err
	}
	for i := range accts {
		a := &accts[i]
		pa, err := ledgerAccountToProto(a)
		if err != nil {
			log.Printf("ledger: skipping ledger account %d: %v", a.ID, err)
			continue
		}
		resp.LedgerAccounts = append(resp.LedgerAccounts, pa)
	}
	return nil
}

// initialCurrencies is the seed list of currencies offered in the
// account creation form.
var initialCurrencies = []*prosperv1.CurrencyInfo{
	{Code: "USD", Name: "US Dollar"},
	{Code: "EUR", Name: "Euro"},
	{Code: "RUB", Name: "Russian Ruble"},
	{Code: "GBP", Name: "Pound Sterling"},
	{Code: "CHF", Name: "Swiss Franc"},
	{Code: "JPY", Name: "Japanese Yen"},
}

func (s *Service) ListAvailableCurrencies(_ context.Context, _ *prosperv1.ListAvailableCurrenciesRequest) (*prosperv1.ListAvailableCurrenciesResponse, error) {
	return &prosperv1.ListAvailableCurrenciesResponse{Currencies: initialCurrencies}, nil
}

func (s *Service) UpsertCategory(ctx context.Context, req *prosperv1.UpsertCategoryRequest) (*prosperv1.UpsertCategoryResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	if req.Category == nil {
		return nil, errors.New("category required")
	}
	c := req.Category
	if c.Id != 0 {
		if _, err := s.db.ExecForUser(ctx, userID,
			`UPDATE Category SET name = :name, parentCategoryId = :parentCategoryId, displayOrder = :displayOrder
			 WHERE id = :id AND userId = :userId`,
			map[string]any{
				"id":               c.Id,
				"name":             c.Name,
				"parentCategoryId": c.ParentCategoryId,
				"displayOrder":     c.DisplayOrder,
			}); err != nil {
			return nil, err
		}
		return &prosperv1.UpsertCategoryResponse{CategoryId: c.Id}, nil
	}
	res, err := s.db.NamedExecForUser(ctx, userID,
		`INSERT INTO Category
		        ( userId,  name,  parentCategoryId,  displayOrder)
		 VALUES (:userId, :name, :parentCategoryId, :displayOrder)`,
		model.Category{
			Name:             c.Name,
			ParentCategoryID: c.ParentCategoryId,
			DisplayOrder:     c.DisplayOrder,
		})
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	return &prosperv1.UpsertCategoryResponse{CategoryId: int32(id)}, nil
}

// WriteTransactionForm persists a transaction-form submission
// (expense, income or transfer) and any companion records the form
// implies (entry lines, split context, tags, refund/debt links). It
// returns the id of the new Transaction row.
func (s *Service) WriteTransactionForm(ctx context.Context, req *prosperv1.WriteTransactionFormRequest) (*prosperv1.WriteTransactionFormResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	id, err := txform.Write(ctx, s.db, userID, req)
	if err != nil {
		return nil, err
	}
	return &prosperv1.WriteTransactionFormResponse{TransactionId: id}, nil
}

func (s *Service) UpdateDisplaySettings(ctx context.Context, req *prosperv1.UpdateDisplaySettingsRequest) (*prosperv1.UpdateDisplaySettingsResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	if req.Settings == nil {
		return nil, errors.New("settings required")
	}
	// DisplaySettings is created at user registration, so this is a
	// pure update — the row must already exist.
	res, err := s.db.ExecForUser(ctx, userID,
		`UPDATE DisplaySettings
		 SET displayCurrencyCode = :displayCurrencyCode,
		     excludeCategoryIdsInStats = :excludeCategoryIdsInStats
		 WHERE userId = :userId`,
		map[string]any{
			"displayCurrencyCode":       req.Settings.DisplayCurrencyCode,
			"excludeCategoryIdsInStats": formatCategoryIDs(req.Settings.ExcludeCategoryIdsInStats),
		})
	if err != nil {
		return nil, err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return nil, err
	}
	if rows == 0 {
		return nil, fmt.Errorf("DisplaySettings missing for user %d", userID)
	}
	// Display currency is the target of every rate fetch, so a change
	// invalidates the active set of pairs.
	s.rateTrigger.TriggerFetch()
	return &prosperv1.UpdateDisplaySettingsResponse{}, nil
}
