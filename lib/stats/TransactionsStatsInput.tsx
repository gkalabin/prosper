import {
  Interval,
  eachMonthOfInterval,
  eachQuarterOfInterval,
  eachYearOfInterval,
  isWithinInterval,
} from 'date-fns';
import {Income} from 'lib/model/transaction/Income';
import {
  Expense,
  Transaction,
  isExpense,
  isIncome,
} from 'lib/model/transaction/Transaction';

export class TransactionsStatsInput {
  constructor(
    private readonly _transactions: Transaction[],
    private readonly _interval: Interval
  ) {}

  transactionsAllTime() {
    return this._transactions;
  }

  expensesAllTime(): Expense[] {
    return this._transactions.filter((t): t is Expense => isExpense(t));
  }

  expenses() {
    return this.intervalOnly(this.expensesAllTime());
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

  private intervalOnly<T extends {timestampEpoch: number}>(ts: T[]) {
    return ts.filter(t => isWithinInterval(t.timestampEpoch, this._interval));
  }
}
