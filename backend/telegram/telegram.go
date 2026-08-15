// Package telegram delivers "new bank transaction" notifications to a
// user's Telegram chat and records their one-tap Add responses through
// the same suggestion and write paths the web form uses.
package telegram

import (
	"errors"
	"time"
)

const (
	longPollTimeout = 50 * time.Second
	// linkTokenTTL bounds how long a minted deep-link token stays valid.
	linkTokenTTL = 15 * time.Minute
	// getMeRetryBackoff is the wait between getMe attempts while
	// validating the token at boot, so a Telegram outage at startup does
	// not take the poll loop down.
	getMeRetryBackoff = 10 * time.Second
	// pollErrorBackoff is the wait after a failed getUpdates before
	// polling again, so a persistent transport error does not busy-loop.
	pollErrorBackoff = 5 * time.Second
)

// errChatLinkedElsewhere reports a link attempt on a chat already owned by
// a different user; the chat is never reassigned. errTokenInvalid reports
// an unknown or expired link token. Both are internal sentinels the bot
// maps to a generic reply, so a message never reveals why linking failed.
var (
	errChatLinkedElsewhere = errors.New("telegram: chat not available for linking")
	errTokenInvalid        = errors.New("telegram: link token invalid or expired")
)

const (
	msgConnected    = "✅ Connected. I'll message you when new bank transactions appear."
	msgStartNoToken = "Open Prosper settings and tap \"Connect Telegram\" to link this chat."
	msgLinkExpired  = "This link has expired. Generate a new one in Prosper settings."
	msgLinkFailed   = "Couldn't connect this chat. Please try again from Prosper settings."

	msgAdded              = "✅ Added"
	msgIgnoredInApp       = "🙈 Ignored in the app"
	msgAlreadyRecorded    = "✅ Already recorded in the app"
	msgNoLongerSuggested  = "No longer suggested — open Prosper to review it."
	msgSuggestionsChanged = "Suggestions changed — review and tap Add again."
	msgCouldNotAdd        = "Couldn't add it — open Prosper to add it manually."
	msgActionFailed       = "Something went wrong. Please try again."
)
