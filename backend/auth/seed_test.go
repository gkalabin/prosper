package auth

import (
	"strings"
	"testing"
)

func TestPlanCategoryInserts(t *testing.T) {
	cases := []struct {
		name string
		in   []string
		want []categoryInsert
	}{
		{
			name: "empty input",
			in:   nil,
			want: []categoryInsert{},
		},
		{
			name: "single top-level",
			in:   []string{"Travel"},
			want: []categoryInsert{
				{name: "Travel", parentInsertIndex: noParentIndex},
			},
		},
		{
			name: "single nested path emits parent before child",
			in:   []string{"Food > Groceries"},
			want: []categoryInsert{
				{name: "Food", parentInsertIndex: noParentIndex},
				{name: "Groceries", parentInsertIndex: 0},
			},
		},
		{
			name: "siblings under one parent share the parent slot",
			in:   []string{"Food > Groceries", "Food > Eating Out"},
			want: []categoryInsert{
				{name: "Food", parentInsertIndex: noParentIndex},
				{name: "Groceries", parentInsertIndex: 0},
				{name: "Eating Out", parentInsertIndex: 0},
			},
		},
		{
			name: "deep nesting chains parents correctly",
			in:   []string{"A > B > C"},
			want: []categoryInsert{
				{name: "A", parentInsertIndex: noParentIndex},
				{name: "B", parentInsertIndex: 0},
				{name: "C", parentInsertIndex: 1},
			},
		},
		{
			name: "duplicate paths produce no extra inserts",
			in:   []string{"Food > Groceries", "Food > Groceries"},
			want: []categoryInsert{
				{name: "Food", parentInsertIndex: noParentIndex},
				{name: "Groceries", parentInsertIndex: 0},
			},
		},
		{
			name: "multiple top-level entries are kept in input order",
			in:   []string{"Income > Salary", "Travel"},
			want: []categoryInsert{
				{name: "Income", parentInsertIndex: noParentIndex},
				{name: "Salary", parentInsertIndex: 0},
				{name: "Travel", parentInsertIndex: noParentIndex},
			},
		},
		{
			name: "whitespace around segments is trimmed",
			in:   []string{"  Food   >  Eating Out "},
			want: []categoryInsert{
				{name: "Food", parentInsertIndex: noParentIndex},
				{name: "Eating Out", parentInsertIndex: 0},
			},
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := planCategoryInserts(tc.in)
			if !equalInserts(got, tc.want) {
				t.Fatalf("got %+v, want %+v", got, tc.want)
			}
		})
	}
}

func equalInserts(a, b []categoryInsert) bool {
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

func TestSplitAndTrim(t *testing.T) {
	cases := []struct {
		name string
		in   string
		sep  string
		want []string
	}{
		{
			name: "trims surrounding whitespace on each segment",
			in:   "  Food   >  Eating Out  ",
			sep:  ">",
			want: []string{"Food", "Eating Out"},
		},
		{
			name: "single segment with no separator",
			in:   "Travel",
			sep:  ">",
			want: []string{"Travel"},
		},
		{
			name: "empty string yields one empty segment",
			in:   "",
			sep:  ">",
			want: []string{""},
		},
		{
			name: "leading separator yields leading empty segment",
			in:   "> Eating Out",
			sep:  ">",
			want: []string{"", "Eating Out"},
		},
		{
			name: "trailing separator yields trailing empty segment",
			in:   "Food >",
			sep:  ">",
			want: []string{"Food", ""},
		},
		{
			name: "internal whitespace inside a segment is preserved",
			in:   "  Eating  Out  ",
			sep:  ">",
			want: []string{"Eating  Out"},
		},
		{
			name: "consecutive separators produce empty middle segments",
			in:   "A >> C",
			sep:  ">",
			want: []string{"A", "", "C"},
		},
		{
			name: "multi-character separator",
			in:   " a -> b -> c ",
			sep:  "->",
			want: []string{"a", "b", "c"},
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := splitAndTrim(tc.in, tc.sep)
			if strings.Join(got, "|") != strings.Join(tc.want, "|") {
				t.Errorf("got %v, want %v", got, tc.want)
			}
		})
	}
}
