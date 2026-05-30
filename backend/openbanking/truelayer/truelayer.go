// Package truelayer implements the open-banking Provider against
// TrueLayer's data API.
package truelayer

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/model"
	"prosper/moneyutil"
	"prosper/openbanking/httpx"
	"prosper/userdb"
)

// TrueLayer API endpoints, scope and OAuth refresh-token lifetime.
const (
	authURL          = "https://auth.truelayer.com/"
	tokenURL         = "https://auth.truelayer.com/connect/token"
	revokeURL        = "https://auth.truelayer.com/api/delete"
	accountsURL      = "https://api.truelayer.com/data/v1/accounts"
	balanceURL       = "https://api.truelayer.com/data/v1/accounts/%s/balance"
	refreshTokenLife = 90 * 24 * time.Hour
	// scope is the space-separated list of OAuth permissions requested
	// at authorization time. accounts/balance/transactions drive the
	// data endpoints; offline_access is required for the refresh-token
	// flow.
	scope          = "accounts balance transactions offline_access"
	dateOnlyFormat = "2006-01-02"
	// connectPath is appended to the public app URL to build the
	// redirect URI the browser lands on after authorizing on TrueLayer.
	connectPath = "/api/open-banking/truelayer/connect"
)

// Provider implements openbanking.Provider against TrueLayer's data API.
type Provider struct {
	db           *userdb.DB
	clientID     string
	clientSecret string
	// publicAppURL is the origin the user's browser reaches the Next
	// frontend at. Used to derive the reconnect redirect URI without
	// asking the caller for it.
	publicAppURL string
	httpClient   *http.Client
}

func New(db *userdb.DB, clientID, clientSecret, publicAppURL string) *Provider {
	return &Provider{
		db:           db,
		clientID:     clientID,
		clientSecret: clientSecret,
		publicAppURL: publicAppURL,
		httpClient:   httpx.NewClient(),
	}
}

func (*Provider) Kind() prosperv1.Provider { return prosperv1.Provider_PROVIDER_TRUELAYER }

func (t *Provider) accessToken(ctx context.Context, userID, bankID int32) (string, error) {
	var tok model.OpenBankingToken
	if err := t.db.GetForUser(ctx, &tok, userID,
		`SELECT *
		   FROM TrueLayerToken
		  WHERE bankId = :bankId
		    AND userId = :userId`,
		map[string]any{"bankId": bankID}); err != nil {
		return "", err
	}
	if time.Now().Before(tok.AccessValidUntil) {
		return tok.Access, nil
	}
	if time.Now().After(tok.RefreshValidUntil) {
		return "", errors.New("truelayer refresh token expired; reauthorisation required")
	}
	return t.refreshAccessToken(ctx, userID, bankID, tok.Refresh)
}

type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
}

func (t *Provider) refreshAccessToken(ctx context.Context, userID, bankID int32, refresh string) (string, error) {
	r, err := t.requestToken(ctx, url.Values{
		"grant_type":    {"refresh_token"},
		"refresh_token": {refresh},
	})
	if err != nil {
		return "", err
	}
	now := time.Now()
	newRefresh := r.RefreshToken
	if newRefresh == "" {
		newRefresh = refresh
	}
	if _, err := t.db.ExecForUser(ctx, userID,
		`UPDATE TrueLayerToken
		    SET access            = :access,
		        accessValidUntil  = :accessValidUntil,
		        refresh           = :refresh,
		        refreshValidUntil = :refreshValidUntil
		  WHERE bankId = :bankId
		    AND userId = :userId`,
		map[string]any{
			"bankId":            bankID,
			"access":            r.AccessToken,
			"accessValidUntil":  now.Add(time.Duration(r.ExpiresIn) * time.Second),
			"refresh":           newRefresh,
			"refreshValidUntil": now.Add(refreshTokenLife),
		}); err != nil {
		return "", err
	}
	return r.AccessToken, nil
}

// requestToken issues a form-encoded POST against TrueLayer's token
// endpoint, attaching the client credentials. Used by both the
// authorization-code exchange and the refresh-token flow.
func (t *Provider) requestToken(ctx context.Context, form url.Values) (tokenResponse, error) {
	form.Set("client_id", t.clientID)
	form.Set("client_secret", t.clientSecret)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		tokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return tokenResponse{}, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := t.httpClient.Do(req)
	if err != nil {
		return tokenResponse{}, err
	}
	defer resp.Body.Close()
	if !httpx.IsSuccess(resp.StatusCode) {
		b, _ := io.ReadAll(resp.Body)
		return tokenResponse{}, fmt.Errorf("truelayer token HTTP %d: %s", resp.StatusCode, string(b))
	}
	var r tokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		return tokenResponse{}, err
	}
	return r, nil
}

type balanceBody struct {
	Results []struct {
		Available float64 `json:"available"`
		Current   float64 `json:"current"`
	} `json:"results"`
}

func (t *Provider) FetchBalance(ctx context.Context, userID, bankID int32, externalAccountID string) (int64, error) {
	access, err := t.accessToken(ctx, userID, bankID)
	if err != nil {
		return 0, err
	}
	var r balanceBody
	if err := t.getJSON(ctx, fmt.Sprintf(balanceURL, url.PathEscape(externalAccountID)), access, &r); err != nil {
		return 0, err
	}
	if len(r.Results) == 0 {
		return 0, errors.New("no balance returned")
	}
	return moneyutil.FloatUnitsToNanos(r.Results[0].Current), nil
}

func (t *Provider) ConnectionExpiresAt(ctx context.Context, userID, bankID int32) (time.Time, error) {
	var until time.Time
	if err := t.db.GetForUser(ctx, &until, userID,
		`SELECT refreshValidUntil
		   FROM TrueLayerToken
		  WHERE bankId = :bankId
		    AND userId = :userId`,
		map[string]any{"bankId": bankID}); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return time.Time{}, fmt.Errorf("truelayer: bank %d not connected", bankID)
		}
		return time.Time{}, err
	}
	return until, nil
}

type accountsBody struct {
	Results []struct {
		AccountID   string `json:"account_id"`
		DisplayName string `json:"display_name"`
		Currency    string `json:"currency"`
		Provider    struct {
			DisplayName string `json:"display_name"`
		} `json:"provider"`
	} `json:"results"`
}

func (t *Provider) ListExternalAccounts(ctx context.Context, userID, bankID int32) ([]*prosperv1.ExternalAccount, error) {
	access, err := t.accessToken(ctx, userID, bankID)
	if err != nil {
		return nil, err
	}
	var r accountsBody
	if err := t.getJSON(ctx, accountsURL, access, &r); err != nil {
		return nil, err
	}
	out := make([]*prosperv1.ExternalAccount, 0, len(r.Results))
	for _, a := range r.Results {
		name := fmt.Sprintf("%s %s (%s)", a.DisplayName, a.Provider.DisplayName, a.Currency)
		out = append(out, &prosperv1.ExternalAccount{ExternalId: a.AccountID, Name: name})
	}
	return out, nil
}

// redirectURI is the absolute URL the browser lands on after the user
// authorizes the app on TrueLayer's side.
func (t *Provider) redirectURI() string {
	return t.publicAppURL + connectPath
}

// AuthURL returns the TrueLayer hosted authorization URL the browser
// should redirect to. The bank id is passed as the OAuth `state` so the
// callback can identify which bank the new tokens belong to.
func (t *Provider) AuthURL(bankID int32) string {
	q := url.Values{}
	q.Set("response_type", "code")
	q.Set("client_id", t.clientID)
	q.Set("scope", scope)
	q.Set("redirect_uri", t.redirectURI())
	q.Set("state", fmt.Sprintf("%d", bankID))
	return authURL + "?" + q.Encode()
}

// ExchangeCode exchanges an authorization code for access/refresh
// tokens and stores them against bank_id. The returned wasReconnect
// flag is true when a prior token row was replaced (the user is
// re-authorising) and false when this stored the bank's first token.
func (t *Provider) ExchangeCode(ctx context.Context, userID, bankID int32, code string) (bool, error) {
	r, err := t.requestToken(ctx, url.Values{
		"grant_type":   {"authorization_code"},
		"code":         {code},
		"redirect_uri": {t.redirectURI()},
	})
	if err != nil {
		return false, err
	}
	var existing int
	if err := t.db.GetForUser(ctx, &existing, userID,
		`SELECT COUNT(*)
		   FROM TrueLayerToken
		  WHERE bankId = :bankId
		    AND userId = :userId`,
		map[string]any{"bankId": bankID}); err != nil {
		return false, err
	}
	now := time.Now()
	if _, err := t.db.NamedExecForUser(ctx, userID,
		`INSERT INTO TrueLayerToken
		        ( userId,  bankId,  access,  accessValidUntil,  refresh,  refreshValidUntil)
		 VALUES (:userId, :bankId, :access, :accessValidUntil, :refresh, :refreshValidUntil)
		 ON DUPLICATE KEY UPDATE access            = VALUES(access),
		                         accessValidUntil  = VALUES(accessValidUntil),
		                         refresh           = VALUES(refresh),
		                         refreshValidUntil = VALUES(refreshValidUntil)`,
		model.OpenBankingToken{
			BankID:            bankID,
			Access:            r.AccessToken,
			AccessValidUntil:  now.Add(time.Duration(r.ExpiresIn) * time.Second),
			Refresh:           r.RefreshToken,
			RefreshValidUntil: now.Add(refreshTokenLife),
		}); err != nil {
		return false, err
	}
	return existing > 0, nil
}

// Disconnect best-effort revokes the token at TrueLayer and deletes
// the local row. Failures revoking remotely are intentionally
// ignored — disconnect must succeed even if the token has already
// been invalidated upstream.
func (t *Provider) Disconnect(ctx context.Context, userID, bankID int32) error {
	if access, err := t.accessToken(ctx, userID, bankID); err == nil {
		t.bestEffortRevoke(ctx, access)
	}
	_, err := t.db.ExecForUser(ctx, userID,
		`DELETE FROM TrueLayerToken
		  WHERE bankId = :bankId
		    AND userId = :userId`,
		map[string]any{"bankId": bankID})
	return err
}

// bestEffortRevoke calls TrueLayer's revoke endpoint and drains the
// response. Failures are logged so a permanently broken upstream
// surfaces in the logs, but the caller proceeds either way.
func (t *Provider) bestEffortRevoke(ctx context.Context, access string) {
	req, _ := http.NewRequestWithContext(ctx, http.MethodDelete, revokeURL, nil)
	req.Header.Set("Authorization", "Bearer "+access)
	req.Header.Set("Content-Type", "application/json")
	resp, err := t.httpClient.Do(req)
	if err != nil {
		log.Printf("truelayer: revoke token: %v", err)
		return
	}
	defer resp.Body.Close()
	if !httpx.IsSuccess(resp.StatusCode) {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("truelayer: revoke token HTTP %d: %s", resp.StatusCode, string(body))
		return
	}
	io.Copy(io.Discard, resp.Body)
}

// ReconnectURL returns the URL the user should be redirected to in
// order to reauthorise an existing bank.
func (t *Provider) ReconnectURL(_ context.Context, _, bankID int32) (string, error) {
	return t.AuthURL(bankID), nil
}

// getJSON issues an authorised GET and decodes the response body
// into dest.
func (t *Provider) getJSON(ctx context.Context, u, access string, dest any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+access)
	resp, err := t.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if !httpx.IsSuccess(resp.StatusCode) {
		return fmt.Errorf("truelayer GET %s HTTP %d: %s", u, resp.StatusCode, string(body))
	}
	return json.Unmarshal(body, dest)
}
