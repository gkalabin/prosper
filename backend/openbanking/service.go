package openbanking

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	"prosper/auth"
	prosperv1 "prosper/gen/prosper/v1"
	"prosper/model"
	"prosper/userdb"
)

// transactionsLookbackMonths controls how far back to look for transactions on each fetch.
const transactionsLookbackMonths = 3

// errNoProvider signals that no provider is configured for a given bank.
var errNoProvider = errors.New("openbanking: no provider configured for bank")

// providerTokenTables enumerates the (provider, token table) pairs
// providerForBank consults to decide which provider owns a bank.
var providerTokenTables = []struct {
	provider prosperv1.Provider
	query    string
}{
	{prosperv1.Provider_PROVIDER_TRUELAYER, `SELECT COUNT(*) FROM TrueLayerToken WHERE bankId = :bankId AND userId = :userId`},
	{prosperv1.Provider_PROVIDER_GOCARDLESS, `SELECT COUNT(*) FROM GoCardlessToken WHERE bankId = :bankId AND userId = :userId`},
	{prosperv1.Provider_PROVIDER_STARLING, `SELECT COUNT(*) FROM StarlingToken WHERE bankId = :bankId AND userId = :userId`},
}

type Service struct {
	prosperv1.UnimplementedOpenBankingServiceServer
	db   *userdb.DB
	prov map[prosperv1.Provider]Provider
	// refreshInterval is the minimum age of a bank's last fetch before
	// the scheduler fetches it again. Zero disables the scheduler.
	refreshInterval time.Duration
}

func NewService(db *userdb.DB, refreshInterval time.Duration) *Service {
	return &Service{
		db:              db,
		prov:            map[prosperv1.Provider]Provider{},
		refreshInterval: refreshInterval,
	}
}

// RegisterProvider adds a provider implementation to the service, keyed
// by its Kind().
func (s *Service) RegisterProvider(p Provider) {
	s.prov[p.Kind()] = p
}

func (s *Service) loadMappingsForUser(ctx context.Context, userID int32) ([]model.OpenBankingMapping, error) {
	var rows []model.OpenBankingMapping
	err := s.db.SelectForUser(ctx, &rows, userID,
		`SELECT * FROM ExternalAccountMapping WHERE userId = :userId`)
	return rows, err
}

func (s *Service) loadMappingForAccount(ctx context.Context, userID, internalAccountID int32) (model.OpenBankingMapping, error) {
	mappings, err := s.loadMappingsForUser(ctx, userID)
	if err != nil {
		return model.OpenBankingMapping{}, err
	}
	for _, m := range mappings {
		if m.InternalAccountID == internalAccountID {
			return m, nil
		}
	}
	return model.OpenBankingMapping{}, sql.ErrNoRows
}

// providerForBank returns the registered Provider for (userID,
// bankID). It consults each provider's token table in turn — at most
// one will hold a row for any given (user, bank). Returns
// errNoProvider when none does.
func (s *Service) providerForBank(ctx context.Context, userID, bankID int32) (Provider, error) {
	for _, t := range providerTokenTables {
		var n int
		if err := s.db.GetForUser(ctx, &n, userID, t.query, map[string]any{"bankId": bankID}); err != nil {
			return nil, err
		}
		if n == 0 {
			continue
		}
		p, ok := s.prov[t.provider]
		if !ok {
			log.Printf("openbanking: bank %d has %s token but provider is not registered",
				bankID, t.provider)
			return nil, errNoProvider
		}
		return p, nil
	}
	return nil, errNoProvider
}

// GetOpenBankingTransactions serves stored transactions from the DB.
func (s *Service) GetOpenBankingTransactions(ctx context.Context, _ *prosperv1.GetOpenBankingTransactionsRequest) (*prosperv1.GetOpenBankingTransactionsResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	resp := &prosperv1.GetOpenBankingTransactionsResponse{}
	mappings, err := s.loadMappingsForUser(ctx, userID)
	if err != nil {
		return resp, err
	}
	fetches, err := s.lastSuccessfulFetchByAccount(ctx, userID)
	if err != nil {
		return resp, err
	}
	byAccount := map[int32]*prosperv1.AccountTransactions{}
	for _, m := range mappings {
		acc := &prosperv1.AccountTransactions{InternalAccountId: m.InternalAccountID}
		if f, ok := fetches[m.InternalAccountID]; ok {
			acc.LastFetchedAt = timestamppb.New(f.StartedAt)
		}
		byAccount[m.InternalAccountID] = acc
		resp.Accounts = append(resp.Accounts, acc)
	}
	since := time.Now().AddDate(0, -transactionsLookbackMonths, 0)
	for internalAccountID, f := range fetches {
		acc, ok := byAccount[internalAccountID]
		if !ok {
			continue
		}
		rows, err := s.transactionsForFetch(ctx, userID, f.ID, since)
		if err != nil {
			return resp, err
		}
		for _, r := range rows {
			acc.Transactions = append(acc.Transactions, protoOpenBankingTransaction(r))
		}
	}
	return resp, nil
}

// transactionsForFetch returns the transactions a fetch returned, newest
// first, limited to those at or after since.
func (s *Service) transactionsForFetch(ctx context.Context, userID, fetchID int32, since time.Time) ([]model.OpenBankingTransaction, error) {
	var rows []model.OpenBankingTransaction
	err := s.db.SelectForUser(ctx, &rows, userID,
		`SELECT t.*
		   FROM OpenBankingTransaction t
		   JOIN OpenBankingFetchTransaction ft
		     ON ft.openBankingTransactionId = t.id
		    AND ft.userId = t.userId
		  WHERE t.userId = :userId
		    AND t.timestamp >= :since
		    AND ft.fetchId = :fetchId
		  ORDER BY t.timestamp DESC`,
		map[string]any{"since": since, "fetchId": fetchID})
	return rows, err
}

// FetchNow fetches fresh transactions for the requested account immediately,
// bypassing the scheduler's refresh interval.
func (s *Service) FetchNow(ctx context.Context, req *prosperv1.FetchNowRequest) (*prosperv1.FetchNowResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	if req.InternalAccountId == 0 {
		return nil, errors.New("internal_account_id is required")
	}
	m, err := s.loadMappingForAccount(ctx, userID, req.InternalAccountId)
	if err != nil {
		return nil, err
	}
	result := &prosperv1.AccountTransactions{InternalAccountId: m.InternalAccountID}
	resp := &prosperv1.FetchNowResponse{Result: result}
	p, err := s.providerForBank(ctx, userID, m.BankID)
	if err != nil {
		result.Error = err.Error()
		return resp, nil
	}
	fetched, err := s.fetchAccount(ctx, userID, p, m, model.FetchTriggerManual)
	if err != nil {
		result.Error = err.Error()
		return resp, nil
	}
	result.LastFetchedAt = timestamppb.New(time.Now().UTC())
	for _, ft := range fetched {
		result.Transactions = append(result.Transactions, protoOpenBankingTransaction(ft))
	}
	return resp, nil
}

func (s *Service) lastSuccessfulFetchByAccount(ctx context.Context, userID int32) (map[int32]model.OpenBankingFetch, error) {
	var rows []model.OpenBankingFetch
	if err := s.db.SelectForUser(ctx, &rows, userID,
		`SELECT f.* FROM OpenBankingFetch f
		JOIN (
			SELECT MAX(id) AS maxId
			FROM OpenBankingFetch
			WHERE userId = :userId AND status = 'SUCCESS'
			GROUP BY internalAccountId
		) latest ON f.id = latest.maxId`); err != nil {
		return nil, err
	}
	byAccount := make(map[int32]model.OpenBankingFetch)
	for _, r := range rows {
		byAccount[r.InternalAccountID] = r
	}
	return byAccount, nil
}

func (s *Service) GetBalances(ctx context.Context, _ *prosperv1.GetBalancesRequest) (*prosperv1.GetBalancesResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	resp := &prosperv1.GetBalancesResponse{}
	rows, err := s.loadMappingsForUser(ctx, userID)
	if err != nil {
		return resp, err
	}
	for _, r := range rows {
		p, err := s.providerForBank(ctx, userID, r.BankID)
		if err != nil {
			log.Printf("openbanking: failed to find provider for bank %d: %v", r.BankID, err)
			continue
		}
		b, err := p.FetchBalance(ctx, userID, r.BankID, r.ExternalAccountID)
		if err != nil {
			log.Printf("openbanking: failed to fetch balance for bank %d: %v", r.BankID, err)
			continue
		}
		resp.Accounts = append(resp.Accounts, &prosperv1.AccountBalanceResult{
			InternalAccountId: r.InternalAccountID,
			BalanceNanos:      b,
		})
	}
	return resp, nil
}

func (s *Service) GetConnectionStatus(ctx context.Context, _ *prosperv1.GetConnectionStatusRequest) (*prosperv1.GetConnectionStatusResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	resp := &prosperv1.GetConnectionStatusResponse{}
	var bankIDs []int32
	if err := s.db.SelectForUser(ctx, &bankIDs, userID,
		`SELECT id FROM Bank WHERE userId = :userId`); err != nil {
		return resp, err
	}
	for _, bid := range bankIDs {
		p, err := s.providerForBank(ctx, userID, bid)
		if err != nil {
			continue
		}
		exp, err := p.ConnectionExpiresAt(ctx, userID, bid)
		if err != nil {
			continue
		}
		resp.Expirations = append(resp.Expirations, &prosperv1.ConnectionExpiration{
			BankId:    bid,
			ExpiresAt: timestamppb.New(exp),
			Provider:  p.Kind(),
		})
	}
	return resp, nil
}

// Disconnect tears down the bank connection at the matching provider,
// removes its locally stored credentials, and clears any account
// mappings that linked this bank to external accounts.
func (s *Service) Disconnect(ctx context.Context, req *prosperv1.DisconnectRequest) (*prosperv1.DisconnectResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	p, err := s.providerForBank(ctx, userID, req.BankId)
	if err != nil {
		return nil, err
	}
	if err := p.Disconnect(ctx, userID, req.BankId); err != nil {
		return nil, err
	}
	if _, err := s.db.ExecForUser(ctx, userID,
		`DELETE FROM ExternalAccountMapping
		  WHERE userId = :userId
		    AND bankId = :bankId`,
		map[string]any{"bankId": req.BankId}); err != nil {
		return nil, err
	}
	return &prosperv1.DisconnectResponse{}, nil
}

func (s *Service) ReconnectInfo(ctx context.Context, req *prosperv1.ReconnectInfoRequest) (*prosperv1.ReconnectInfoResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	p, err := s.providerForBank(ctx, userID, req.BankId)
	if err != nil {
		return nil, err
	}
	url, err := p.ReconnectURL(ctx, userID, req.BankId)
	if err != nil {
		return nil, err
	}
	return &prosperv1.ReconnectInfoResponse{RedirectUrl: url}, nil
}

func (s *Service) ListExternalAccounts(ctx context.Context, req *prosperv1.ListExternalAccountsRequest) (*prosperv1.ListExternalAccountsResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	p, err := s.providerForBank(ctx, userID, req.BankId)
	if err != nil {
		return nil, err
	}
	accs, err := p.ListExternalAccounts(ctx, userID, req.BankId)
	if err != nil {
		return nil, err
	}
	return &prosperv1.ListExternalAccountsResponse{Accounts: accs}, nil
}

func (s *Service) ListMappings(ctx context.Context, req *prosperv1.ListMappingsRequest) (*prosperv1.ListMappingsResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	if req.BankId == 0 {
		return nil, errors.New("bank_id is required")
	}
	resp := &prosperv1.ListMappingsResponse{}
	rows, err := s.loadMappingsForUser(ctx, userID)
	if err != nil {
		return resp, err
	}
	for _, r := range rows {
		if r.BankID != req.BankId {
			continue
		}
		resp.Mappings = append(resp.Mappings, &prosperv1.AccountMapping{
			InternalAccountId: r.InternalAccountID,
			ExternalAccountId: r.ExternalAccountID,
		})
	}
	return resp, nil
}

func (s *Service) SetMappings(ctx context.Context, req *prosperv1.SetMappingsRequest) (*prosperv1.SetMappingsResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	tx, err := s.db.BeginTx(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	// Delete the bank's existing mappings, then insert the new set. The
	// unique constraint is (userId, internalAccountId) so this two-step
	// replacement is safe.
	if _, err := tx.ExecForUser(ctx, userID,
		`DELETE FROM ExternalAccountMapping
		  WHERE userId = :userId
		    AND bankId = :bankId`,
		map[string]any{"bankId": req.BankId}); err != nil {
		return nil, err
	}
	if len(req.Mappings) > 0 {
		rows := make([]model.OpenBankingMapping, len(req.Mappings))
		for i, m := range req.Mappings {
			rows[i] = model.OpenBankingMapping{
				InternalAccountID: m.InternalAccountId,
				ExternalAccountID: m.ExternalAccountId,
				BankID:            req.BankId,
			}
		}
		if _, err := tx.NamedExecForUser(ctx, userID,
			`INSERT INTO ExternalAccountMapping
			        ( userId,  internalAccountId,  externalAccountId,  bankId)
			 VALUES (:userId, :internalAccountId, :externalAccountId, :bankId)`,
			rows); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &prosperv1.SetMappingsResponse{}, nil
}
