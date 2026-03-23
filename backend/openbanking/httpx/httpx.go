// Package httpx holds HTTP helpers shared by every open-banking
// provider implementation.
package httpx

import (
	"net/http"
	"time"
)

// timeout is the default per-request timeout used by every provider's
// HTTP client.
const timeout = 30 * time.Second

// NewClient builds a uniformly-configured HTTP client.
func NewClient() *http.Client {
	return &http.Client{Timeout: timeout}
}

// IsSuccess returns true for any 2xx status code.
func IsSuccess(status int) bool {
	return status >= 200 && status < 300
}
