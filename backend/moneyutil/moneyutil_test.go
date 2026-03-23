package moneyutil

import "testing"

func TestFloatUnitsToNanos(t *testing.T) {
	cases := []struct {
		in   float64
		want int64
	}{
		{0, 0},
		{1, 1_000_000_000},
		{-1, -1_000_000_000},
		{1.5, 1_500_000_000},
		{-12.34, -12_340_000_000},
		{0.000_000_001, 1},
		{-0.000_000_001, -1},
	}
	for _, c := range cases {
		if got := FloatUnitsToNanos(c.in); got != c.want {
			t.Errorf("FloatUnitsToNanos(%v) = %d, want %d", c.in, got, c.want)
		}
	}
}

func TestParseDecimalToNanos(t *testing.T) {
	cases := []struct {
		in      string
		want    int64
		wantErr bool
	}{
		// Whole numbers.
		{"0", 0, false},
		{"1", 1_000_000_000, false},
		{"42", 42_000_000_000, false},
		// Fractional values, both signs.
		{"1.5", 1_500_000_000, false},
		{"-12.34", -12_340_000_000, false},
		{"-0", 0, false},
		{"-0.5", -500_000_000, false},
		// Smallest representable nano on the positive and negative side.
		{"0.000000001", 1, false},
		{"-0.000000001", -1, false},
		// Truncation past 9 decimal places: digits after position 9 are
		// silently dropped (no rounding).
		{"0.0000000019", 1, false},
		{"-0.0000000019", -1, false},
		{"0.123456789999", 123_456_789, false},
		// Empty integer part is allowed and treated as zero.
		{".5", 500_000_000, false},
		{"-.5", -500_000_000, false},
		// Trailing zero padding works for any partial fractional length.
		{"1.1", 1_100_000_000, false},
		{"1.10", 1_100_000_000, false},
		{"1.100000000", 1_100_000_000, false},
		// No fractional part still parses.
		{"123.", 123_000_000_000, false},
		// Error cases.
		{"", 0, true},
		{"abc", 0, true},
		{"1.x", 0, true},
		{"1.2.3", 0, true},
		{" 1", 0, true},
		{"1 ", 0, true},
		{"+1", 0, true},
	}
	for _, c := range cases {
		got, err := ParseDecimalToNanos(c.in)
		if c.wantErr {
			if err == nil {
				t.Errorf("ParseDecimalToNanos(%q) = %d, want error", c.in, got)
			}
			continue
		}
		if err != nil {
			t.Errorf("ParseDecimalToNanos(%q) unexpected error: %v", c.in, err)
			continue
		}
		if got != c.want {
			t.Errorf("ParseDecimalToNanos(%q) = %d, want %d", c.in, got, c.want)
		}
	}
}
