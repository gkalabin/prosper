import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {Currency} from '@/lib/model/Currency';
import {
  Transaction,
  isExpense,
  isIncome,
} from '@/lib/model/transaction/Transaction';
import {isWithinInterval, type Interval} from 'date-fns';

export type DisplayCurrencyTransaction = {
  t: Transaction;
  ownShare: AmountWithCurrency;
  allParties: AmountWithCurrency;
};

export class TransactionsStatsInput {
  constructor(
    private readonly _interval: Interval,
    private readonly _exchanged: DisplayCurrencyTransaction[],
    private readonly _currency: Currency
  ) {}

  currency(): Currency {
    return this._currency!;
  }

  expensesAllTime(): DisplayCurrencyTransaction[] {
    return this._exchanged.filter(x => isExpense(x.t));
  }

  expenses(): DisplayCurrencyTransaction[] {
    return this._exchanged.filter(
      x => isExpense(x.t) && this.isWithinInterval(x.t)
    );
  }

  incomeAllTime(): DisplayCurrencyTransaction[] {
    return this._exchanged.filter(x => isIncome(x.t));
  }

  income(): DisplayCurrencyTransaction[] {
    return this._exchanged.filter(
      x => isIncome(x.t) && this.isWithinInterval(x.t)
    );
  }

  interval() {
    return this._interval;
  }

  private isWithinInterval(t: Transaction): boolean {
    return isWithinInterval(t.timestampEpoch, this._interval);
  }
}
