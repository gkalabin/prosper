import { format, formatDistance, isAfter, subDays } from "date-fns";

export function shortRelativeDate(d: Date) {
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

export function toDateTimeLocal(d: Date) {
  // 2022-12-19T18:05:59
  return format(d, "yyyy-MM-dd\'T\'HH:mm");
}
