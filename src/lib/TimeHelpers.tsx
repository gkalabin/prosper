import {format, formatDistance, isAfter, subDays} from 'date-fns';

export function shortRelativeDate(d: Date | number) {
  const today = new Date();
  const fourDaysAgo = subDays(today, 4);
  if (isAfter(d, fourDaysAgo)) {
    // 2 days ago
    return formatDistance(d, today, {includeSeconds: false, addSuffix: true});
  }
  if (new Date(d).getFullYear() === today.getFullYear()) {
    // Nov 19
    return format(d, 'MMM dd');
  }
  // Nov 19 '22
  return format(d, "MMM dd ''yy");
}
