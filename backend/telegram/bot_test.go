package telegram

import "testing"

func TestParseCallback(t *testing.T) {
	tests := []struct {
		data       string
		wantAction callbackAction
		wantID     int32
		wantOK     bool
	}{
		{"add:42", actionAdd, 42, true},
		{"add", "", 0, false},
		{"add:notanumber", "", 0, false},
		{"add:4294967338", "", 0, false},
		{"add:-4294967338", "", 0, false},
		{"ignore:7", "", 0, false},
		{"bogus:42", "", 0, false},
		{"bogus:", "", 0, false},
		{":42", "", 0, false},
		{"::::", "", 0, false},
		{"", "", 0, false},
	}
	for _, tc := range tests {
		action, id, ok := parseCallback(tc.data)
		if ok != tc.wantOK || action != tc.wantAction || id != tc.wantID {
			t.Errorf("parseCallback(%q) = (%q, %d, %v), want (%q, %d, %v)",
				tc.data, action, id, ok, tc.wantAction, tc.wantID, tc.wantOK)
		}
	}
}

func TestCommandToken(t *testing.T) {
	tests := []struct {
		text    string
		command string
		want    string
	}{
		{"/start abc123", startCommand, "abc123"},
		{"/start", startCommand, ""},
		{"/start   ", startCommand, ""},
		{"/link abc123", linkCommand, "abc123"},
		{"/link", linkCommand, ""},
		{"hello", startCommand, ""},
	}
	for _, tc := range tests {
		if got := commandToken(tc.text, tc.command); got != tc.want {
			t.Errorf("commandToken(%q, %q) = %q, want %q", tc.text, tc.command, got, tc.want)
		}
	}
}

func TestFormatCallbackRoundTrips(t *testing.T) {
	data := formatCallback(actionAdd, 42)
	action, id, ok := parseCallback(data)
	if !ok || action != actionAdd || id != 42 {
		t.Errorf("parseCallback(%q) = (%q, %d, %v), want (%q, 42, true)", data, action, id, ok, actionAdd)
	}
}
