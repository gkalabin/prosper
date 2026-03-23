package nordigen

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"prosper/openbanking/httpx"
)

// nordigenJSON issues an HTTP request against the Nordigen API and
// decodes the response body into dest. When body is non-nil, the body
// is sent as JSON. When access is non-empty, a Bearer authorization
// header is attached. Non-2xx responses are surfaced as errors that
// include the response body so callers can debug them.
func (n *Provider) nordigenJSON(ctx context.Context, method, url, access string, body []byte, dest any) error {
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
		return fmt.Errorf("nordigen %s %s HTTP %d: %s", method, url, resp.StatusCode, string(respBody))
	}
	return json.Unmarshal(respBody, dest)
}

// postJSON is shorthand for an unauthenticated POST with a JSON body
// that decodes the response into dest.
func (n *Provider) postJSON(ctx context.Context, url string, body []byte, dest any) error {
	return n.nordigenJSON(ctx, http.MethodPost, url, "", body, dest)
}

// getJSON is shorthand for a Bearer-authorised GET that decodes the
// response into dest.
func (n *Provider) getJSON(ctx context.Context, url, access string, dest any) error {
	return n.nordigenJSON(ctx, http.MethodGet, url, access, nil, dest)
}
