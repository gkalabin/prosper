import { startOfMonth, startOfYear } from "date-fns";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import { Currency } from "lib/model/Currency";
import { AppendMap } from "lib/util/AppendingMap";
import { percentile } from "lib/util/util";

export class Timeseries<T> {
  private readonly _monthly: AppendMap<number, T>;
  private readonly _yearly: AppendMap<number, T>;
  private readonly _zero: T;

  constructor(combineFn: (x: T, y: T) => T, zero: T) {
    this._monthly = new AppendMap<number, T>(combineFn, zero);
    this._yearly = new AppendMap<number, T>(combineFn, zero);
    this._zero = zero;
  }

  append(time: Date | number, newValue: T) {
    const m = startOfMonth(time).getTime();
    this._monthly.append(m, newValue);
    const y = startOfYear(time).getTime();
    this._yearly.append(y, newValue);
  }

  month(time: Date | number) {
    const m = startOfMonth(time).getTime();
    return this._monthly.get(m) ?? this._zero;
  }

  year(time: Date | number) {
    const y = startOfYear(time).getTime();
    return this._yearly.get(y) ?? this._zero;
  }

  protected monthly() {
    return this._monthly;
  }

  protected yearly() {
    return this._yearly;
  }
}

export class MoneyTimeseries extends Timeseries<AmountWithCurrency> {
  constructor(private readonly _currency: Currency) {
    super(AmountWithCurrency.add, AmountWithCurrency.zero(_currency));
  }

  monthlyPercentile(p: number) {
    return percentile([...this.monthly().values()], p);
  }

  monthRoundDollars(dates: number[] | Date[]) {
    return dates.map((m: number | Date) => this.month(m).round().dollar());
  }

  yearRoundDollars(dates: number[] | Date[]) {
    return dates.map((m: number | Date) => this.year(m).round().dollar());
  }

  monthlyMap() {
    return this.monthly();
  }
}
