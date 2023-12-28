import { AmountWithCurrency } from "lib/AmountWithCurrency";
import { Category } from "lib/model/Category";

export function dollarsRounded(
  amount: AmountWithCurrency | undefined,
): number {
  if (!amount) {
    return 0;
  }
  return Math.round(amount.dollar());
}

export function categoryNameById(
  categoryId: number,
  categories: Category[],
): string {
  const found = categories.find((c) => c.id() === categoryId);
  if (!found) {
    return "Unknown category";
  }
  return found.nameWithAncestors();
}
