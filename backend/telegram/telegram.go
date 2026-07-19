// Package telegram delivers "new bank transaction" notifications to a
// user's Telegram chat and records their one-tap responses (Add, Ignore)
// through the same suggestion and write paths the web form uses.
package telegram

// TODO: linking a chat has poor ux. You click a link in prosper, it opens tg, then two buttons open in web or open in tg, you pick one and then it suggests to call /start which responds with nothing. Create /link <PROSPER_CODE> command and use it to link the chat. the code should be shown in the settings page, so the user can manually trigger the link, but also keep the button for convenience.

import "time"

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

const (
	msgConnected    = "✅ Connected. I'll message you when new bank transactions appear."
	msgStartNoToken = "Open Prosper settings and tap \"Connect Telegram\" to link this chat."
	msgLinkExpired  = "This link has expired. Generate a new one in Prosper settings."
	// TODO: do not reveal this. This is spicy for security.
	msgChatLinkedElsewhere = "This Telegram account is already connected to another Prosper user."
	msgLinkFailed          = "Couldn't connect this chat. Please try again from Prosper settings."

	msgIgnored         = "🙈 Ignored"
	msgIgnoredInApp    = "🙈 Ignored in the app"
	msgAlreadyRecorded = "✅ Already recorded in the app"
	// TODO: open the app to do what? It is not clear.
	msgNoLongerSuggested  = "No longer suggested — open the app."
	msgSuggestionsChanged = "Suggestions changed — review and tap Add again."
	// TODO: open the app to do what? It is not clear.
	msgCouldNotAdd  = "Couldn't add — open the app."
	msgActionFailed = "Something went wrong. Please try again."
)
