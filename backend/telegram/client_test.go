package telegram

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func testClient(server *httptest.Server) *Client {
	c := NewClient("test-token")
	c.baseURL = server.URL
	return c
}

func TestClientSendMessageReturnsMessageID(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/sendMessage") {
			t.Errorf("unexpected path %s", r.URL.Path)
		}
		w.Write([]byte(`{"ok":true,"result":{"message_id":4242,"chat":{"id":1},"text":"hi"}}`))
	}))
	defer server.Close()

	got, err := testClient(server).SendMessage(context.Background(), 1, "hi", nil)
	if err != nil {
		t.Fatalf("SendMessage: %v", err)
	}
	if got != 4242 {
		t.Errorf("message id = %d, want 4242", got)
	}
}

func TestClientGetUpdatesSendsOffsetAndAllowedUpdates(t *testing.T) {
	var body map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewDecoder(r.Body).Decode(&body)
		w.Write([]byte(`{"ok":true,"result":[{"update_id":10,"message":{"message_id":1,"chat":{"id":5},"text":"/start abc"}}]}`))
	}))
	defer server.Close()

	updates, err := testClient(server).GetUpdates(context.Background(), 99, time.Second)
	if err != nil {
		t.Fatalf("GetUpdates: %v", err)
	}
	if len(updates) != 1 || updates[0].UpdateID != 10 {
		t.Fatalf("updates = %+v", updates)
	}
	if body["offset"].(float64) != 99 {
		t.Errorf("offset = %v, want 99", body["offset"])
	}
	allowed, _ := body["allowed_updates"].([]any)
	if len(allowed) != 2 || allowed[0] != "message" || allowed[1] != "callback_query" {
		t.Errorf("allowed_updates = %v", body["allowed_updates"])
	}
}

func TestClientHonoursRetryAfterOn429(t *testing.T) {
	var calls atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if calls.Add(1) == 1 {
			w.Write([]byte(`{"ok":false,"error_code":429,"description":"Too Many Requests","parameters":{"retry_after":0}}`))
			return
		}
		w.Write([]byte(`{"ok":true,"result":{"message_id":7,"chat":{"id":1}}}`))
	}))
	defer server.Close()

	got, err := testClient(server).SendMessage(context.Background(), 1, "hi", nil)
	if err != nil {
		t.Fatalf("SendMessage: %v", err)
	}
	if got != 7 {
		t.Errorf("message id = %d, want 7 after retry", got)
	}
	if calls.Load() != 2 {
		t.Errorf("expected a retry after 429, got %d calls", calls.Load())
	}
}

func TestClientUsernameCachesGetMe(t *testing.T) {
	var calls atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		w.Write([]byte(`{"ok":true,"result":{"username":"prosper_bot"}}`))
	}))
	defer server.Close()

	c := testClient(server)
	for range 3 {
		name, err := c.Username(context.Background())
		if err != nil {
			t.Fatalf("Username: %v", err)
		}
		if name != "prosper_bot" {
			t.Errorf("username = %q", name)
		}
	}
	if calls.Load() != 1 {
		t.Errorf("getMe should be called once and cached, got %d", calls.Load())
	}
}

func TestClientNonRetryableErrorSurfaces(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"ok":false,"error_code":400,"description":"Bad Request: chat not found"}`))
	}))
	defer server.Close()

	if _, err := testClient(server).SendMessage(context.Background(), 1, "hi", nil); err == nil {
		t.Fatal("expected a non-retryable 400 to surface as an error")
	}
}
