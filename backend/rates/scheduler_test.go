package rates

import "testing"

func TestBuildPairs(t *testing.T) {
	cases := []struct {
		name     string
		used     []string
		displays []string
		want     [][2]string
	}{
		{
			name:     "single display, drops self-pair",
			used:     []string{"USD", "EUR", "GBP"},
			displays: []string{"USD"},
			want:     [][2]string{{"EUR", "USD"}, {"GBP", "USD"}},
		},
		{
			name:     "multiple displays produce cross product",
			used:     []string{"EUR", "GBP"},
			displays: []string{"USD", "EUR"},
			want:     [][2]string{{"EUR", "USD"}, {"GBP", "USD"}, {"GBP", "EUR"}},
		},
		{
			name:     "duplicate inputs deduplicate",
			used:     []string{"EUR", "EUR"},
			displays: []string{"USD", "USD"},
			want:     [][2]string{{"EUR", "USD"}},
		},
		{
			name:     "empty inputs return empty",
			used:     nil,
			displays: []string{"USD"},
			want:     [][2]string{},
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := buildPairs(tc.used, tc.displays)
			if !equalPairs(got, tc.want) {
				t.Fatalf("got %v, want %v", got, tc.want)
			}
		})
	}
}

func equalPairs(a, b [][2]string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
