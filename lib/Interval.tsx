import { format, isAfter, isBefore, isValid, subMonths } from "date-fns";

export class Interval {
  private readonly _start?: Date;
  private readonly _end?: Date;
  private readonly _label?: string;

  public constructor({
    start,
    end,
    label,
  }: {
    start?: Date;
    end?: Date;
    label?: string;
  }) {
    if (isBefore(end, start)) {
      throw new Error(`end must be after start, got ${start} and ${end}`);
    }
    this._start = isValid(start) ? start : undefined;
    this._end = isValid(end) ? end : undefined;
    this._label = label;
  }
  start() {
    return this._start;
  }
  end() {
    return this._end;
  }
  includes(date: Date): boolean {
    if (this._start && isBefore(date, this._start)) {
      return false;
    }
    if (this._end && isAfter(date, this._end)) {
      return false;
    }
    return true;
  }
  isSame(other: Interval): boolean {
    return (
      this.sameNullableDates(this._start, other._start) &&
      this.sameNullableDates(this._end, other._end)
    );
  }
  private sameNullableDates(a: Date | undefined, b: Date | undefined): boolean {
    if (a === undefined && b === undefined) {
      return true;
    }
    if (a === undefined || b === undefined) {
      return false;
    }
    return a.getTime() === b.getTime();
  }
  format(): string {
    if (this._label) {
      return this._label;
    }
    if (this._start && this._end) {
      return `${format(this._start, "yyyy-MM-dd")} - ${format(
        this._end,
        "yyyy-MM-dd"
      )}`;
    }
    if (this._start) {
      return `After ${format(this._start, "yyyy-MM-dd")}`;
    }
    if (this._end) {
      return `Before ${format(this._end, "yyyy-MM-dd")}`;
    }
  }
}

const now = new Date();
export const LAST_6_MONTHS = new Interval({
  label: "Last 6 months",
  start: subMonths(now, 6),
  end: now,
});
export const LAST_12_MONTHS = new Interval({
  label: "Last 12 months",
  start: subMonths(now, 12),
  end: now,
});
export const ALL_TIME = new Interval({
  label: "All time",
  end: now,
});
export const commonIntervals = [LAST_6_MONTHS, LAST_12_MONTHS, ALL_TIME];
