package sliceutil

import (
	"reflect"
	"testing"
)

func TestUniqMostFrequent(t *testing.T) {
	tests := []struct {
		name  string
		items []string
		want  []string
	}{
		{"empty", nil, nil},
		{"distinct keeps order", []string{"a", "b", "c"}, []string{"a", "b", "c"}},
		{"orders by frequency", []string{"a", "b", "b", "c", "b", "c"}, []string{"b", "c", "a"}},
		{"ties keep first occurrence", []string{"y", "x", "x", "y"}, []string{"y", "x"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := UniqMostFrequent(tt.items); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("UniqMostFrequent(%v) = %v, want %v", tt.items, got, tt.want)
			}
		})
	}
}
