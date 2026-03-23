// Package starling implements the open-banking Provider against
// Starling Bank's personal API.
package starling

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/model"
	"prosper/moneyutil"
	"prosper/openbanking/httpx"
	"prosper/userdb"
)

// Starling API endpoints.
const (
	accountsURL = "https://api.starlingbank.com/api/v2/accounts"
	balanceURL  = "https://api.starlingbank.com/api/v2/accounts/%s/balance"

	// externalAccountIDSep separates the accountUid and categoryUid in
	// the encoded externalAccountID column ("accountUid@categoryUid").
	// Matches the format produced by the Starling connect flow.
	externalAccountIDSep = "@"
)

// Provider implements openbanking.Provider against Starling Bank's
// personal API.
type Provider struct {
	db         *userdb.DB
	httpClient *http.Client
}

func New(db *userdb.DB) *Provider {
	return &Provider{db: db, httpClient: httpx.NewClient()}
}

func (*Provider) Kind() prosperv1.Provider { return prosperv1.Provider_PROVIDER_STARLING }

func (s *Provider) accessToken(ctx context.Context, userID, bankID int32) (string, error) {
	var tok model.OpenBankingToken
	if err := s.db.GetForUser(ctx, &tok, userID,
		`SELECT *
		   FROM StarlingToken
		  WHERE bankId = :bankId
		    AND userId = :userId`,
		map[string]any{"bankId": bankID}); err != nil {
		return "", err
	}
	if time.Now().After(tok.AccessValidUntil) {
		return "", errors.New("starling access token expired; reauthorisation required")
	}
	return tok.Access, nil
}

// accountAndCategory splits the encoded externalAccountID column into
// its accountUid and categoryUid components.
func accountAndCategory(externalAccountID string) (account, category string, err error) {
	a, c, ok := strings.Cut(externalAccountID, externalAccountIDSep)
	if !ok {
		return "", "", fmt.Errorf("starling: invalid externalAccountID %q (expected accountUid:categoryUid)", externalAccountID)
	}
	return a, c, nil
}

type balanceResponse struct {
	Effective struct {
		MinorUnits int64 `json:"minorUnits"`
	} `json:"effectiveBalance"`
}

func (s *Provider) FetchBalance(ctx context.Context, userID, bankID int32, externalAccountID string) (int64, error) {
	access, err := s.accessToken(ctx, userID, bankID)
	if err != nil {
		return 0, err
	}
	accountUID, _, err := accountAndCategory(externalAccountID)
	if err != nil {
		return 0, err
	}
	var r balanceResponse
	if err := s.getJSON(ctx, fmt.Sprintf(balanceURL, accountUID), access, &r); err != nil {
		return 0, err
	}
	return r.Effective.MinorUnits * moneyutil.NanosPerCent, nil
}

func (s *Provider) ConnectionExpiresAt(ctx context.Context, userID, bankID int32) (time.Time, error) {
	var until time.Time
	if err := s.db.GetForUser(ctx, &until, userID,
		`SELECT accessValidUntil
		   FROM StarlingToken
		  WHERE bankId = :bankId
		    AND userId = :userId`,
		map[string]any{"bankId": bankID}); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return time.Time{}, fmt.Errorf("starling: bank %d not connected", bankID)
		}
		return time.Time{}, err
	}
	return until, nil
}

type accountsBody struct {
	Accounts []struct {
		AccountUID      string `json:"accountUid"`
		DefaultCategory string `json:"defaultCategory"`
		Name            string `json:"name"`
		Currency        string `json:"currency"`
	} `json:"accounts"`
}

func (s *Provider) ListExternalAccounts(ctx context.Context, userID, bankID int32) ([]*prosperv1.ExternalAccount, error) {
	access, err := s.accessToken(ctx, userID, bankID)
	if err != nil {
		return nil, err
	}
	var r accountsBody
	if err := s.getJSON(ctx, accountsURL, access, &r); err != nil {
		return nil, err
	}
	out := make([]*prosperv1.ExternalAccount, 0, len(r.Accounts))
	for _, a := range r.Accounts {
		out = append(out, &prosperv1.ExternalAccount{
			ExternalId: a.AccountUID + externalAccountIDSep + a.DefaultCategory,
			Name:       fmt.Sprintf("%s (%s)", a.Name, a.Currency),
		})
	}
	return out, nil
}

// SetToken stores a new Starling personal access token. Starling's
// personal API has no OAuth flow; users paste a token from their
// developer portal. Returns wasReconnect=true when a prior token row
// was replaced (the user is re-authorising) and false when this stored
// the bank's first token.
func (s *Provider) SetToken(ctx context.Context, userID, bankID int32, accessToken string) (bool, error) {
	var existing int
	if err := s.db.GetForUser(ctx, &existing, userID,
		`SELECT COUNT(*)
		   FROM StarlingToken
		  WHERE bankId = :bankId
		    AND userId = :userId`,
		map[string]any{"bankId": bankID}); err != nil {
		return false, err
	}
	farFuture := time.Now().AddDate(100, 0, 0)
	if _, err := s.db.NamedExecForUser(ctx, userID,
		`INSERT INTO StarlingToken
		        ( userId,  bankId,  access,  accessValidUntil,  refresh,  refreshValidUntil)
		 VALUES (:userId, :bankId, :access, :accessValidUntil, :refresh, :refreshValidUntil)
		 ON DUPLICATE KEY UPDATE access            = VALUES(access),
		                         accessValidUntil  = VALUES(accessValidUntil),
		                         refresh           = VALUES(refresh),
		                         refreshValidUntil = VALUES(refreshValidUntil)`,
		model.OpenBankingToken{
			BankID:            bankID,
			Access:            accessToken,
			AccessValidUntil:  farFuture,
			RefreshValidUntil: farFuture,
		}); err != nil {
		return false, err
	}
	return existing > 0, nil
}

// ReconnectURL is not supported: Starling's personal API uses a
// user-pasted access token rather than an OAuth-style redirect flow,
// so there is no URL to reconnect through.
func (*Provider) ReconnectURL(_ context.Context, _, _ int32) (string, error) {
	return "", errors.New("starling: reconnect not supported")
}

// Disconnect deletes the local Starling token. Starling has no token
// revocation endpoint for personal access tokens.
func (s *Provider) Disconnect(ctx context.Context, userID, bankID int32) error {
	_, err := s.db.ExecForUser(ctx, userID,
		`DELETE FROM StarlingToken
		  WHERE bankId = :bankId
		    AND userId = :userId`,
		map[string]any{"bankId": bankID})
	return err
}

// getJSON issues an authorised GET and decodes the response body
// into dest.
func (s *Provider) getJSON(ctx context.Context, u, access string, dest any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+access)
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if !httpx.IsSuccess(resp.StatusCode) {
		return fmt.Errorf("starling GET %s HTTP %d: %s", u, resp.StatusCode, string(body))
	}
	return json.Unmarshal(body, dest)
}
