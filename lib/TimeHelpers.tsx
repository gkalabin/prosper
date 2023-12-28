import { format, formatDistance, isAfter, subDays } from "date-fns";

export function shortRelativeDate(d: Date | number) {
  const today = new Date();
  const fourDaysAgo = subDays(today, 4);
  if (isAfter(d, fourDaysAgo)) {
    // 2 days ago
    return formatDistance(d, today, { includeSeconds: false, addSuffix: true });
  }
  // Nov 19
  return format(d, "MMM dd");
}

export function descriptiveDateTime(d: Date) {
  return format(d, "MMM dd, yy, H:mm O");
}

export function formatMonth(d: Date| number): string {
  // Nov 2022
  return format(d, "MMM yyyy");
}
