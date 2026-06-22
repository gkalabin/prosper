// Package sliceutil holds small generic slice helpers shared across service layers.
package sliceutil

import "slices"

// UniqMostFrequent returns the distinct values ordered by how often
// they occur, most frequent first; ties keep first-occurrence order.
func UniqMostFrequent[T comparable](items []T) []T {
	counts := make(map[T]int)
	var order []T
	for _, v := range items {
		if counts[v] == 0 {
			order = append(order, v)
		}
		counts[v]++
	}
	slices.SortStableFunc(order, func(a, b T) int { return counts[b] - counts[a] })
	return order
}
