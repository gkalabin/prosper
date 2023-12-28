import { Interval, eachMonthOfInterval, isWithinInterval } from "date-fns";
import { Transaction } from "lib/model/Transaction";

export class TransactionsStatsInput {
  constructor(
    private readonly _transactions: Transaction[],
    private readonly _interval: Interval
  ) {}

  expensesAllTime() {
    return this._transactions.filter(
      (t) => t.isPersonalExpense() || t.isThirdPartyExpense()
    );
  }

  expenses() {
    return this.intervalOnly(this.expensesAllTime());
  }

  incomeAllTime() {
    return this._transactions.filter((t) => t.isIncome());
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

  private intervalOnly(ts: Transaction[]) {
    return ts.filter((t) => isWithinInterval(t.timestamp, this._interval));
  }
}
