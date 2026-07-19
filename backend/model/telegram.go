package model

import "time"

// TelegramLink is a user's connected Telegram chat: where notifications
// are delivered and the proof that inbound updates from this chat act
// for this user. One chat per user, one user per chat.
type TelegramLink struct {
	UserID    int32     `db:"userId"`
	ChatID    int64     `db:"chatId"`
	CreatedAt time.Time `db:"createdAt"`
	UpdatedAt time.Time `db:"updatedAt"`
}

// TelegramLinkToken is a user's outstanding single-use link token, minted
// by the settings page and consumed by a /start deep link.
type TelegramLinkToken struct {
	UserID    int32     `db:"userId"`
	Token     string    `db:"token"`
	ExpiresAt time.Time `db:"expiresAt"`
	CreatedAt time.Time `db:"createdAt"`
	UpdatedAt time.Time `db:"updatedAt"`
}

// TelegramNotification is one delivery-log row: a draft messaged to a
// user's chat. MessageText is the rendered summary the Add tap verifies
// against before writing.
type TelegramNotification struct {
	ID          int32     `db:"id"`
	UserID      int32     `db:"userId"`
	ChatID      int64     `db:"chatId"`
	MessageText string    `db:"messageText"`
	CreatedAt   time.Time `db:"createdAt"`
	UpdatedAt   time.Time `db:"updatedAt"`
}
