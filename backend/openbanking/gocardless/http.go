package gocardless

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"

	"prosper/openbanking/httpx"
)

// gocardlessError is the JSON body GoCardless returns for a failed request.
type gocardlessError struct {
	Summary string `json:"summary"`
	Detail  string `json:"detail"`
}

// gocardlessJSON issues an HTTP request against the GoCardless API and
// decodes the response body into dest. When body is non-nil, the body
// is sent as JSON. When access is non-empty, a Bearer authorization
// header is attached. Non-2xx responses are surfaced as errors that
// include the response body so callers can debug them.
func (n *Provider) gocardlessJSON(ctx context.Context, method, url, access string, body []byte, dest any) error {
	var reader io.Reader
	if body != nil {
		reader = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, url, reader)
	if err != nil {
		return err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if access != "" {
		req.Header.Set("Authorization", "Bearer "+access)
	}
	resp, err := n.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if !httpx.IsSuccess(resp.StatusCode) {
		return apiError(method, url, resp.StatusCode, respBody)
	}
	return json.Unmarshal(respBody, dest)
}

// apiError turns a non-2xx GoCardless response into a human-readable error.
func apiError(method, url string, status int, body []byte) error {
	log.Printf("gocardless: %s %s HTTP %d: %s", method, url, status, body)
	var env gocardlessError
	if err := json.Unmarshal(body, &env); err == nil && env.Summary != "" {
		if env.Detail != "" && env.Detail != env.Summary {
			return fmt.Errorf("%s: %s", env.Summary, env.Detail)
		}
		return errors.New(env.Summary)
	}
	return fmt.Errorf("request failed with HTTP %d", status)
}

// postJSON is shorthand for an unauthenticated POST with a JSON body
// that decodes the response into dest.
func (n *Provider) postJSON(ctx context.Context, url string, body []byte, dest any) error {
	return n.gocardlessJSON(ctx, http.MethodPost, url, "", body, dest)
}

// getJSON is shorthand for a Bearer-authorised GET that decodes the
// response into dest.
func (n *Provider) getJSON(ctx context.Context, url, access string, dest any) error {
	return n.gocardlessJSON(ctx, http.MethodGet, url, access, nil, dest)
}
