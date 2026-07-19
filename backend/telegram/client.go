package telegram

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

// apiBaseURL is the Telegram Bot API root; a method call is
// <apiBaseURL>/bot<token>/<method>.
const apiBaseURL = "https://api.telegram.org"

// maxSendAttempts caps how many times a call is retried after a 429 or
// 5xx before the error is surfaced to the caller.
const maxSendAttempts = 3

// serverErrorBackoff is the wait before retrying a 5xx response.
const serverErrorBackoff = 2 * time.Second

// Client is a thin Telegram Bot API HTTP client. Safe for concurrent use.
type Client struct {
	http    *http.Client
	token   string
	baseURL string

	mu       sync.Mutex
	username string // cached getMe result
}

// NewClient builds a client for the given bot token.
//
// TODO: > The HTTP timeout exceeds the long-poll hold so getUpdates can block server-side.
// TODO: this should be where HTTP timeout is set, not at the function comment. Update CLAUDE.md with this and fix comment.
func NewClient(token string) *Client {
	return &Client{
		http:    &http.Client{Timeout: longPollTimeout + 15*time.Second},
		token:   token,
		baseURL: apiBaseURL,
	}
}

// Update is one item from getUpdates.
type Update struct {
	UpdateID      int64          `json:"update_id"`
	Message       *Message       `json:"message"`
	CallbackQuery *CallbackQuery `json:"callback_query"`
}

// Message is a chat message (inbound or the result of a send).
type Message struct {
	MessageID int64  `json:"message_id"`
	Chat      Chat   `json:"chat"`
	Text      string `json:"text"`
}

// Chat identifies a Telegram chat.
type Chat struct {
	ID int64 `json:"id"`
}

// CallbackQuery is a tap on an inline keyboard button.
type CallbackQuery struct {
	ID      string   `json:"id"`
	Data    string   `json:"data"`
	Message *Message `json:"message"`
}

// InlineKeyboard is a message's attached button grid.
type InlineKeyboard struct {
	InlineKeyboard [][]InlineButton `json:"inline_keyboard"`
}

// InlineButton is a single keyboard button. Exactly one of CallbackData
// or URL is set.
type InlineButton struct {
	Text         string `json:"text"`
	CallbackData string `json:"callback_data,omitempty"`
	URL          string `json:"url,omitempty"`
}

// Username returns the bot's @username, deriving it from the token via getMe on first call.
func (c *Client) Username(ctx context.Context) (string, error) {
	c.mu.Lock()
	cached := c.username
	c.mu.Unlock()
	if cached != "" {
		return cached, nil
	}
	var me struct {
		Username string `json:"username"`
	}
	if err := c.do(ctx, "getMe", map[string]any{}, &me); err != nil {
		return "", err
	}
	c.mu.Lock()
	c.username = me.Username
	c.mu.Unlock()
	return me.Username, nil
}

// GetUpdates long-polls for updates after offset, holding up to timeout.
func (c *Client) GetUpdates(ctx context.Context, offset int64, timeout time.Duration) ([]Update, error) {
	payload := map[string]any{
		"offset":          offset,
		"timeout":         int(timeout.Seconds()),
		"allowed_updates": []string{"message", "callback_query"},
	}
	var updates []Update
	if err := c.do(ctx, "getUpdates", payload, &updates); err != nil {
		return nil, err
	}
	return updates, nil
}

// SendMessage posts text to a chat with an optional inline keyboard and
// returns the new message's id.
func (c *Client) SendMessage(ctx context.Context, chatID int64, text string, keyboard *InlineKeyboard) (int64, error) {
	payload := map[string]any{"chat_id": chatID, "text": text}
	if keyboard != nil {
		payload["reply_markup"] = keyboard
	}
	var msg Message
	if err := c.do(ctx, "sendMessage", payload, &msg); err != nil {
		return 0, err
	}
	return msg.MessageID, nil
}

// EditMessageText replaces a message's text and keyboard. A nil keyboard
// removes the buttons — the terminal state after Add or Ignore.
func (c *Client) EditMessageText(ctx context.Context, chatID, messageID int64, text string, keyboard *InlineKeyboard) error {
	payload := map[string]any{"chat_id": chatID, "message_id": messageID, "text": text}
	if keyboard != nil {
		payload["reply_markup"] = keyboard
	}
	return c.do(ctx, "editMessageText", payload, nil)
}

// AnswerCallbackQuery acknowledges a button tap, optionally showing text
// to the user. Telegram spins the button until this is called.
func (c *Client) AnswerCallbackQuery(ctx context.Context, callbackID, text string) error {
	payload := map[string]any{"callback_query_id": callbackID}
	if text != "" {
		payload["text"] = text
	}
	return c.do(ctx, "answerCallbackQuery", payload, nil)
}

// apiResponse is the envelope every Bot API method returns.
type apiResponse struct {
	OK          bool            `json:"ok"`
	Result      json.RawMessage `json:"result"`
	ErrorCode   int             `json:"error_code"`
	Description string          `json:"description"`
	Parameters  *struct {
		RetryAfter int `json:"retry_after"`
	} `json:"parameters"`
}

// do posts payload to a Bot API method and decodes result.
// It retries up to maxSendAttempts on 429 or 5xx responses.
func (c *Client) do(ctx context.Context, method string, payload, result any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	url := fmt.Sprintf("%s/bot%s/%s", c.baseURL, c.token, method)
	for attempt := 1; ; attempt++ {
		env, err := c.roundTrip(ctx, url, body)
		if err != nil {
			return fmt.Errorf("telegram: %s: %w", method, err)
		}
		if env.OK {
			if result != nil && len(env.Result) > 0 {
				return json.Unmarshal(env.Result, result)
			}
			return nil
		}
		wait, retryable := backoffFor(env)
		if !retryable || attempt >= maxSendAttempts {
			return fmt.Errorf("telegram: %s: %d %s", method, env.ErrorCode, env.Description)
		}
		if !sleepCtx(ctx, wait) {
			return ctx.Err()
		}
	}
}

func (c *Client) roundTrip(ctx context.Context, url string, body []byte) (apiResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return apiResponse{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return apiResponse{}, err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return apiResponse{}, err
	}
	var env apiResponse
	if err := json.Unmarshal(raw, &env); err != nil {
		return apiResponse{}, fmt.Errorf("decode response (status %d): %w", resp.StatusCode, err)
	}
	return env, nil
}

// backoffFor decides whether a non-ok response is worth retrying and how long to wait.
func backoffFor(env apiResponse) (time.Duration, bool) {
	if env.ErrorCode >= 500 {
		// TODO: use exponential backoff.
		return serverErrorBackoff, true
	}
	if env.ErrorCode == http.StatusTooManyRequests {
		// TODO: use exponential backoff.
		wait := serverErrorBackoff
		if env.Parameters != nil && env.Parameters.RetryAfter > 0 {
			wait = time.Duration(env.Parameters.RetryAfter) * time.Second
		}
		return wait, true
	}
	return 0, false
}

// sleepCtx waits for d or until ctx is cancelled, reporting whether the
// full wait elapsed.
func sleepCtx(ctx context.Context, d time.Duration) bool {
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-t.C:
		return true
	}
}
