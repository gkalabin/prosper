import {
  eachMonthOfInterval,
  eachQuarterOfInterval,
  eachYearOfInterval,
  format,
  type Interval,
} from 'date-fns';
import {Granularity} from 'lib/util/Granularity';

export function intervalPoints(
  interval: Interval,
  granularity: Granularity
): Date[] {
  switch (granularity) {
    case Granularity.MONTHLY:
      return eachMonthOfInterval(interval);
    case Granularity.QUARTERLY:
      return eachQuarterOfInterval(interval);
    case Granularity.YEARLY:
      return eachYearOfInterval(interval);
    default:
      const _exhaustivenessCheck: never = granularity;
      throw new Error(`Unknown granularity ${_exhaustivenessCheck}`);
  }
}

export function formatPoint(p: Date, g: Granularity): string {
  switch (g) {
    case Granularity.MONTHLY:
      return format(p, 'MMM yyyy');
    case Granularity.QUARTERLY:
      return format(p, 'yyyyQQQ');
    case Granularity.YEARLY:
      return p.getFullYear().toString();
    default:
      const _exhaustivenessCheck: never = g;
      throw new Error(`Unknown granularity ${_exhaustivenessCheck}`);
  }
}
