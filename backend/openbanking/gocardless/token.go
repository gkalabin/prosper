package gocardless

import (
	"context"
	"encoding/json"
	"time"

	"prosper/model"
)

const (
	newTokenURL = apiBase + "/token/new/"
	refreshURL  = apiBase + "/token/refresh/"
)

// tokenResponse is the shape of both the new-token and refresh
// endpoints. Refresh responses leave the refresh fields empty; callers
// that issue a refresh should ignore them.
type tokenResponse struct {
	Access           string `json:"access"`
	Refresh          string `json:"refresh"`
	AccessExpiresIn  int    `json:"access_expires"`
	RefreshExpiresIn int    `json:"refresh_expires"`
}

// requestNewToken hits GoCardless's /token/new endpoint and returns the
// parsed response.
func (n *Provider) requestNewToken(ctx context.Context) (tokenResponse, error) {
	body, _ := json.Marshal(map[string]string{
		"secret_id":  n.secretID,
		"secret_key": n.secretKey,
	})
	var r tokenResponse
	if err := n.postJSON(ctx, newTokenURL, body, &r); err != nil {
		return tokenResponse{}, err
	}
	return r, nil
}

// accessToken returns a usable Bearer token for the bank's stored
// credentials, refreshing or re-creating it from GoCardless as needed.
func (n *Provider) accessToken(ctx context.Context, userID, bankID int32) (string, error) {
	var tok model.OpenBankingToken
	if err := n.db.GetForUser(ctx, &tok, userID,
		`SELECT * FROM GoCardlessToken WHERE bankId = :bankId AND userId = :userId`,
		map[string]any{"bankId": bankID}); err != nil {
		return "", err
	}
	if time.Now().Before(tok.AccessValidUntil) {
		return tok.Access, nil
	}
	if time.Now().After(tok.RefreshValidUntil) {
		return n.replaceAccessToken(ctx, userID, bankID)
	}
	return n.refreshAccessToken(ctx, userID, bankID, tok.Refresh)
}

// refreshAccessToken exchanges a refresh token for a new access token
// and persists it.
func (n *Provider) refreshAccessToken(ctx context.Context, userID, bankID int32, refresh string) (string, error) {
	body, _ := json.Marshal(map[string]string{"refresh": refresh})
	var r tokenResponse
	if err := n.postJSON(ctx, refreshURL, body, &r); err != nil {
		return "", err
	}
	until := time.Now().Add(time.Duration(r.AccessExpiresIn) * time.Second)
	if _, err := n.db.ExecForUser(ctx, userID,
		`UPDATE GoCardlessToken
		    SET access           = :access,
		        accessValidUntil = :accessValidUntil
		  WHERE bankId = :bankId
		    AND userId = :userId`,
		map[string]any{
			"bankId":           bankID,
			"access":           r.Access,
			"accessValidUntil": until,
		}); err != nil {
		return "", err
	}
	return r.Access, nil
}

// replaceAccessToken fetches a brand new access/refresh pair (used
// when the existing refresh token has expired) and updates the row.
func (n *Provider) replaceAccessToken(ctx context.Context, userID, bankID int32) (string, error) {
	r, err := n.requestNewToken(ctx)
	if err != nil {
		return "", err
	}
	access, refresh := tokenValidities(r)
	if _, err := n.db.ExecForUser(ctx, userID,
		`UPDATE GoCardlessToken
		    SET access            = :access,
		        accessValidUntil  = :accessValidUntil,
		        refresh           = :refresh,
		        refreshValidUntil = :refreshValidUntil
		  WHERE bankId = :bankId
		    AND userId = :userId`,
		map[string]any{
			"bankId":            bankID,
			"access":            r.Access,
			"accessValidUntil":  access,
			"refresh":           r.Refresh,
			"refreshValidUntil": refresh,
		}); err != nil {
		return "", err
	}
	return r.Access, nil
}

// ensureToken returns a usable access token for the bank, creating
// the initial GoCardlessToken row on first connection. Returns
// wasReconnect=true when a token already existed (i.e. the user is
// re-authorising) and false when this is a brand-new connection.
func (n *Provider) ensureToken(ctx context.Context, userID, bankID int32) (string, bool, error) {
	var existing int
	if err := n.db.GetForUser(ctx, &existing, userID,
		`SELECT COUNT(*)
		   FROM GoCardlessToken
		  WHERE bankId = :bankId
		    AND userId = :userId`,
		map[string]any{"bankId": bankID}); err != nil {
		return "", false, err
	}
	if existing > 0 {
		tok, err := n.accessToken(ctx, userID, bankID)
		return tok, true, err
	}
	r, err := n.requestNewToken(ctx)
	if err != nil {
		return "", false, err
	}
	access, refresh := tokenValidities(r)
	if _, err := n.db.NamedExecForUser(ctx, userID,
		`INSERT INTO GoCardlessToken
		        ( userId,  bankId,  access,  accessValidUntil,  refresh,  refreshValidUntil)
		 VALUES (:userId, :bankId, :access, :accessValidUntil, :refresh, :refreshValidUntil)`,
		model.OpenBankingToken{
			BankID:            bankID,
			Access:            r.Access,
			AccessValidUntil:  access,
			Refresh:           r.Refresh,
			RefreshValidUntil: refresh,
		}); err != nil {
		return "", false, err
	}
	return r.Access, false, nil
}

// appLevelToken returns a process-wide GoCardless token suitable for
// catalog queries (institutions list) that don't belong to a specific
// bank. The token is cached in-memory until expiry to avoid hammering
// the token endpoint.
func (n *Provider) appLevelToken(ctx context.Context) (string, error) {
	n.appTokenMu.Lock()
	defer n.appTokenMu.Unlock()
	if time.Now().Before(n.appTokenExpiry) && n.appToken != "" {
		return n.appToken, nil
	}
	r, err := n.requestNewToken(ctx)
	if err != nil {
		return "", err
	}
	n.appToken = r.Access
	n.appTokenExpiry = time.Now().Add(time.Duration(r.AccessExpiresIn) * time.Second)
	return n.appToken, nil
}

// tokenValidities translates a token response's TTLs into absolute
// timestamps suitable for the access/refresh validity columns.
func tokenValidities(r tokenResponse) (access, refresh time.Time) {
	now := time.Now()
	access = now.Add(time.Duration(r.AccessExpiresIn) * time.Second)
	refresh = now.Add(time.Duration(r.RefreshExpiresIn) * time.Second)
	return access, refresh
}
