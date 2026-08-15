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

// TelegramMessage is a transaction draft rendered for a chat, in the parts
// a message is laid out from: the kind of transaction it describes, the
// line identifying it, and the supporting body below it.
type TelegramMessage struct {
	Kind  TransactionType `db:"kind"`
	Title string          `db:"title"`
	Body  string          `db:"body"`
}

// TelegramNotification is one delivery-log row: a draft messaged to a
// user's chat, and how it was rendered when they saw it.
type TelegramNotification struct {
	ID     int32 `db:"id"`
	UserID int32 `db:"userId"`
	ChatID int64 `db:"chatId"`
	TelegramMessage
	CreatedAt time.Time `db:"createdAt"`
	UpdatedAt time.Time `db:"updatedAt"`
}

// TelegramNotificationOrigin links a notification to one source event it
// covers. Its primary key doubles as the dedup rule: claiming an origin a
// second time fails the insert, so a draft is never messaged twice.
type TelegramNotificationOrigin struct {
	UserID         int32  `db:"userId"`
	OriginKind     string `db:"originKind"`
	OriginKey      string `db:"originKey"`
	NotificationID int32  `db:"notificationId"`
}
