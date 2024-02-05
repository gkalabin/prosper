import {
  type Interval,
  eachMonthOfInterval,
  eachQuarterOfInterval,
  eachYearOfInterval,
  isWithinInterval,
} from 'date-fns';
import {AmountWithCurrency} from 'lib/AmountWithCurrency';
import {Income} from 'lib/model/transaction/Income';
import {
  Expense,
  Transaction,
  isExpense,
  isIncome,
} from 'lib/model/transaction/Transaction';

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

  expensesAllTime(): Expense[] {
    return this._transactions.filter((t): t is Expense => isExpense(t));
  }

  /**
   * @deprecated Use expensesExchanged instead.
   * @returns the expenses within the provided duration interval.
   */
  expenses() {
    return this.intervalOnly(this.expensesAllTime());
  }

  expensesExchangedAllTime(): DisplayCurrencyTransaction[] {
    return this._exchanged!.filter(x => isExpense(x.t));
  }

  expensesExchanged(): DisplayCurrencyTransaction[] {
    return this._exchanged!.filter(
      x => isExpense(x.t) && this.isWithinInterval(x.t)
    );
  }

  incomeAllTime(): Income[] {
    return this._transactions.filter((t): t is Income => isIncome(t));
  }

  income() {
    return this.intervalOnly(this.incomeAllTime());
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
