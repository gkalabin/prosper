package telegram

import (
	"testing"

	"prosper/model"
)

func TestCategoryPath(t *testing.T) {
	food := model.Category{ID: 1, Name: "Food"}
	groceries := model.Category{ID: 2, Name: "Groceries", ParentCategoryID: &food.ID}
	offline := model.Category{ID: 3, Name: "Offline", ParentCategoryID: &groceries.ID}
	byID := map[int32]model.Category{1: food, 2: groceries, 3: offline}

	tests := map[string]struct {
		category model.Category
		want     string
	}{
		"leaf shows full ancestry": {offline, "Food > Groceries > Offline"},
		"root shows only itself":   {food, "Food"},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			if got := categoryPath(tc.category, byID); got != tc.want {
				t.Errorf("categoryPath = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestCategoryPathStopsOnBrokenChain(t *testing.T) {
	missingParent := int32(99)
	orphan := model.Category{ID: 5, Name: "Orphan", ParentCategoryID: &missingParent}
	if got := categoryPath(orphan, map[int32]model.Category{5: orphan}); got != "Orphan" {
		t.Errorf("categoryPath with missing parent = %q, want %q", got, "Orphan")
	}

	// A cycle (a → b → a) must terminate at the deepest resolvable name.
	a := model.Category{ID: 6, Name: "A"}
	b := model.Category{ID: 7, Name: "B", ParentCategoryID: &a.ID}
	a.ParentCategoryID = &b.ID
	byID := map[int32]model.Category{6: a, 7: b}
	if got := categoryPath(a, byID); got != "B > A" {
		t.Errorf("categoryPath with cycle = %q, want %q", got, "B > A")
	}
}
