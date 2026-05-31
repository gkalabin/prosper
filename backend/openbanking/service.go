package openbanking

import (
	"context"
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
}

func NewService(db *userdb.DB) *Service {
	return &Service{
		db:   db,
		prov: map[prosperv1.Provider]Provider{},
	}
}

// RegisterProvider adds a provider implementation to the service, keyed
// by its Kind().
func (s *Service) RegisterProvider(p Provider) {
	s.prov[p.Kind()] = p
}

const selectExternalAccountMappingsForUser = `SELECT m.userId,
                                                      m.internalAccountId,
                                                      m.externalAccountId,
                                                      a.bankId
                                                 FROM ExternalAccountMapping m
                                                 JOIN BankAccount a
                                                   ON a.id = m.internalAccountId
                                                WHERE m.userId = :userId`

func (s *Service) loadMappingsForUser(ctx context.Context, userID int32) ([]model.OpenBankingMapping, error) {
	var rows []model.OpenBankingMapping
	err := s.db.SelectForUser(ctx, &rows, userID, selectExternalAccountMappingsForUser)
	return rows, err
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

func (s *Service) GetOpenBankingTransactions(ctx context.Context, _ *prosperv1.GetOpenBankingTransactionsRequest) (*prosperv1.GetOpenBankingTransactionsResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	resp := &prosperv1.GetOpenBankingTransactionsResponse{}
	mappings, err := s.loadMappingsForUser(ctx, userID)
	if err != nil {
		return resp, err
	}
	since := time.Now().AddDate(0, -transactionsLookbackMonths, 0)
	for _, m := range mappings {
		p, err := s.providerForBank(ctx, userID, m.BankID)
		if err != nil {
			log.Printf("openbanking: failed to find provider for bank %d: %v", m.BankID, err)
			continue
		}
		txs, err := p.FetchTransactions(ctx, userID, m.BankID, m.ExternalAccountID, since)
		if err != nil {
			log.Printf("openbanking: fetch bank=%d account=%d: %v", m.BankID, m.InternalAccountID, err)
			continue
		}
		resp.Accounts = append(resp.Accounts, &prosperv1.AccountTransactions{
			InternalAccountId: m.InternalAccountID,
			Transactions:      txs,
		})
	}
	return resp, nil
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
		    AND internalAccountId IN (
		      SELECT id
		        FROM BankAccount
		       WHERE userId = :userId
		         AND bankId = :bankId
		    )`,
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
	// Delete existing mappings for this bank's internal accounts, then
	// insert the new set. The unique constraint is (userId,
	// internalAccountId) so this two-step replacement is safe.
	if _, err := tx.ExecForUser(ctx, userID,
		`DELETE FROM ExternalAccountMapping
		  WHERE userId = :userId
		    AND internalAccountId IN (
		      SELECT id
		        FROM BankAccount
		       WHERE userId = :userId
		         AND bankId = :bankId
		    )`,
		map[string]any{"bankId": req.BankId}); err != nil {
		return nil, err
	}
	if len(req.Mappings) > 0 {
		rows := make([]model.OpenBankingMapping, len(req.Mappings))
		for i, m := range req.Mappings {
			rows[i] = model.OpenBankingMapping{
				InternalAccountID: m.InternalAccountId,
				ExternalAccountID: m.ExternalAccountId,
			}
		}
		if _, err := tx.NamedExecForUser(ctx, userID,
			`INSERT INTO ExternalAccountMapping
			        ( userId,  internalAccountId,  externalAccountId)
			 VALUES (:userId, :internalAccountId, :externalAccountId)`,
			rows); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &prosperv1.SetMappingsResponse{}, nil
}
