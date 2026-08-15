package telegram

import "strings"

// htmlEscaper replaces the characters Telegram's HTML parse mode reads as
// markup, so a value containing one is shown literally.
var htmlEscaper = strings.NewReplacer(
	"&", "&amp;",
	"<", "&lt;",
	">", "&gt;",
)

// escapeHTML makes plain text safe to place in a message body.
func escapeHTML(text string) string {
	return htmlEscaper.Replace(text)
}

// code makes text a monospace label.
func code(text string) string {
	return "<code>" + escapeHTML(text) + "</code>"
}
