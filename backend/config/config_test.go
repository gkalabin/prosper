package config

import (
	"reflect"
	"testing"
)

func TestUnrecognizedEnvKeys(t *testing.T) {
	tests := []struct {
		name         string
		env          []string
		unrecognised []string
	}{
		{
			name: "recognized prefixed keys and unprefixed platform vars pass",
			env: []string{
				"PATH=/usr/bin",
				"PORT=3000",
				"K_SERVICE=prosper",
				"PROSPER_DB_HOST=localhost",
				"PROSPER_MAX_USERS_ALLOWED_TO_REGISTER=3",
			},
		},
		{
			name: "stale and misspelled prefixed keys reported sorted",
			env: []string{
				"PROSPER_DB_HOST=localhost",
				"PROSPER_NORDIGEN_SECRET_ID=x",
				"PROSPER_DB_URL=mysql://...",
				"GOCARDLESS_SECRET_ID=ignored-no-prefix",
			},
			unrecognised: []string{"PROSPER_DB_URL", "PROSPER_NORDIGEN_SECRET_ID"},
		},
		{
			name: "empty environment",
			env:  nil,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := unrecognizedEnvKeys(tt.env); !reflect.DeepEqual(got, tt.unrecognised) {
				t.Errorf("unrecognizedEnvKeys() = %v, want %v", got, tt.unrecognised)
			}
		})
	}
}
