import {
  eachMonthOfInterval,
  eachQuarterOfInterval,
  eachYearOfInterval,
  isWithinInterval,
  type Interval,
} from 'date-fns';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {
  Transaction,
  isExpense,
  isIncome,
} from '@/lib/model/transaction/Transaction';

export type DisplayCurrencyTransaction = {
  t: Transaction;
  ownShare: AmountWithCurrency;
  allParties: AmountWithCurrency;
};

export class TransactionsStatsInput {
  constructor(
    private readonly _transactions: Transaction[],
    private readonly _interval: Interval,
    private readonly _exchanged?: DisplayCurrencyTransaction[]
  ) {}

  transactionsAllTime() {
    return this._transactions;
  }

  expensesExchangedAllTime(): DisplayCurrencyTransaction[] {
    return this._exchanged!.filter(x => isExpense(x.t));
  }

  expensesExchanged(): DisplayCurrencyTransaction[] {
    return this._exchanged!.filter(
      x => isExpense(x.t) && this.isWithinInterval(x.t)
    );
  }

  incomeExchangedAllTime(): DisplayCurrencyTransaction[] {
    return this._exchanged!.filter(x => isIncome(x.t));
  }

  incomeExchanged(): DisplayCurrencyTransaction[] {
    return this._exchanged!.filter(
      x => isIncome(x.t) && this.isWithinInterval(x.t)
    );
  }

  interval() {
    return this._interval;
  }

  months() {
    return eachMonthOfInterval(this._interval);
  }

  quarters() {
    return eachQuarterOfInterval(this._interval);
  }

  years() {
    return eachYearOfInterval(this._interval);
  }

  private isWithinInterval(t: Transaction): boolean {
    return isWithinInterval(t.timestampEpoch, this._interval);
  }

  private intervalOnly<T extends {timestampEpoch: number}>(ts: T[]) {
    return ts.filter(t => isWithinInterval(t.timestampEpoch, this._interval));
  }
}
