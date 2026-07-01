import {Granularity} from '@/lib/util/Granularity';
import {
  eachMonthOfInterval,
  eachQuarterOfInterval,
  eachYearOfInterval,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  isSameDay,
  isSameMonth,
  isSameQuarter,
  isSameWeek,
  isSameYear,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  type Interval,
} from 'date-fns';

// utcStartOfDay returns the epoch ms of the UTC midnight that contains `epochMs`.
export function utcStartOfDay(epochMs: number): number {
  const date = new Date(epochMs);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function dateFunctionsForGranularity(granularity: Granularity): {
  slice: (i: Interval) => Date[];
  start: (d: Date) => Date;
  end: (d: Date) => Date;
} {
  switch (granularity) {
    case Granularity.MONTHLY:
      return {
        slice: eachMonthOfInterval,
        start: startOfMonth,
        end: endOfMonth,
      };
    case Granularity.QUARTERLY:
      return {
        slice: eachQuarterOfInterval,
        start: startOfQuarter,
        end: endOfQuarter,
      };
    case Granularity.YEARLY:
      return {
        slice: eachYearOfInterval,
        start: startOfYear,
        end: endOfYear,
      };
    default:
      const _exhaustivenessCheck: never = granularity;
      throw new Error(`Unknown granularity ${_exhaustivenessCheck}`);
  }
}

export function sliceInterval({
  interval,
  granularity,
}: {
  interval: Interval;
  granularity: Granularity;
}): Array<Interval> {
  const {slice, start, end} = dateFunctionsForGranularity(granularity);
  const points: Date[] = slice(interval);
  return points.map(p => ({
    start: start(p),
    end: end(p),
  }));
}

export function formatInterval(i: Interval): string {
  if (isSameDay(i.start, i.end)) {
    return format(i.start, 'd MMM yyyy');
  }
  if (isSameWeek(i.start, i.end)) {
    return `${format(i.start, 'yyyy')} W${format(i.start, 'w')}`;
  }
  if (isSameMonth(i.start, i.end)) {
    return format(i.start, 'MMM yyyy');
  }
  if (isSameQuarter(i.start, i.end)) {
    return format(i.start, 'yyyyQQQ');
  }
  if (isSameYear(i.start, i.end)) {
    return format(i.start, 'yyyy');
  }
  return `${format(i.start, 'd MMM yyyy')}-${format(i.end, 'd MMM yyyy')}`;
}

export function intervalsEqual(i1: Interval, i2: Interval): boolean {
  return isSameDay(i1.start, i2.start) && isSameDay(i1.end, i2.end);
}
