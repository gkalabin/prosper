// Package moneyutil contains low-level helpers for parsing and formatting
// monetary values used by multiple service layers.
package moneyutil

import (
	"fmt"
	"strconv"
	"strings"
)

// NanosPerUnit is the multiplier between a whole currency unit and its
// nano representation: 1 unit = 10^9 nanos.
const NanosPerUnit int64 = 1_000_000_000

// NanosPerCent is the multiplier between a cent (1/100 of a currency unit)
// and its nano representation.
const NanosPerCent int64 = NanosPerUnit / 100

// CentsToNanos converts an integer-cents amount into nanos.
func CentsToNanos(cents int32) int64 { return int64(cents) * NanosPerCent }

// RoundNanosToCent rounds a nanos amount to the nearest whole cent and
// returns it in nanos, so a value derived by arithmetic (e.g. a halved
// shared amount) stays a sum the user can actually pay.
func RoundNanosToCent(nanos int64) int64 {
	sign := int64(1)
	if nanos < 0 {
		sign, nanos = -1, -nanos
	}
	return sign * ((nanos + NanosPerCent/2) / NanosPerCent * NanosPerCent)
}

// FloatUnitsToNanos converts a whole-unit float (e.g. dollars, EURUSD rate)
// into nanos. Used by data sources that hand back JSON numbers.
func FloatUnitsToNanos(units float64) int64 {
	return int64(units * float64(NanosPerUnit))
}

// ParseDecimalToNanos converts a fixed-point decimal string like "12.34"
// or "-0.5" into nanos. Trailing fractional digits beyond 9 places are
// truncated. Returns an error for malformed input.
func ParseDecimalToNanos(s string) (int64, error) {
	if s == "" {
		return 0, fmt.Errorf("moneyutil: empty input")
	}
	negative := strings.HasPrefix(s, "-")
	if negative {
		s = s[1:]
	}
	intPart, fracPart, _ := strings.Cut(s, ".")
	if intPart == "" {
		intPart = "0"
	}
	if len(fracPart) > 9 {
		fracPart = fracPart[:9]
	}
	if !allDigits(intPart) || !allDigits(fracPart) {
		return 0, fmt.Errorf("moneyutil: invalid decimal %q", s)
	}
	whole, err := strconv.ParseInt(intPart, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("moneyutil: parse integer part: %w", err)
	}
	// Pad fractional part to 9 digits so each position contributes exactly
	// one nano.
	fracPart += strings.Repeat("0", 9-len(fracPart))
	frac, err := strconv.ParseInt(fracPart, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("moneyutil: parse fractional part: %w", err)
	}
	v := whole*NanosPerUnit + frac
	if negative {
		v = -v
	}
	return v, nil
}

func allDigits(s string) bool {
	for i := 0; i < len(s); i++ {
		if s[i] < '0' || s[i] > '9' {
			return false
		}
	}
	return true
}
