package ledger

import (
	"reflect"
	"testing"
)

func TestParseCategoryIDs(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want []int32
	}{
		{"empty", "", nil},
		{"single", "7", []int32{7}},
		{"comma separated", "1,2,3", []int32{1, 2, 3}},
		{"trims whitespace", " 1 , 2 ,3 ", []int32{1, 2, 3}},
		{"skips malformed", "1,abc,3", []int32{1, 3}},
		{"skips zero", "0,5", []int32{5}},
		{"skips negative", "-2,4", []int32{4}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := parseCategoryIDs(tt.in)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("parseCategoryIDs(%q) = %v, want %v", tt.in, got, tt.want)
			}
		})
	}
}

func TestFormatCategoryIDs(t *testing.T) {
	tests := []struct {
		name string
		in   []int32
		want string
	}{
		{"nil", nil, ""},
		{"empty", []int32{}, ""},
		{"single", []int32{7}, "7"},
		{"multiple", []int32{1, 2, 3}, "1,2,3"},
		{"unsorted", []int32{3, 1, 2}, "1,2,3"},
		{"duplicates", []int32{1, 1, 2, 2, 3}, "1,2,3"},
		{"unsorted duplicates", []int32{3, 1, 3, 2, 1}, "1,2,3"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := formatCategoryIDs(tt.in)
			if got != tt.want {
				t.Errorf("formatCategoryIDs(%v) = %q, want %q", tt.in, got, tt.want)
			}
		})
	}
}

func TestFormatCategoryIDsDoesNotMutateInput(t *testing.T) {
	in := []int32{3, 1, 2}
	want := []int32{3, 1, 2}
	formatCategoryIDs(in)
	if !reflect.DeepEqual(in, want) {
		t.Errorf("formatCategoryIDs mutated input: got %v, want %v", in, want)
	}
}
