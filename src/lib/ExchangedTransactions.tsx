import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {assert} from '@/lib/assert';
import {Currency} from '@/lib/model/Currency';
import {Income} from '@/lib/model/transaction/Income';
import {
  Expense,
  Transaction,
  isExpense,
  isIncome,
} from '@/lib/model/transaction/Transaction';
import {isWithinInterval, type Interval} from 'date-fns';

export type ExchangedTransaction = {
  t: Transaction;
  ownShare: AmountWithCurrency;
  allParties: AmountWithCurrency;
};

export type ExchangedExpense = {
  t: Expense;
  ownShare: AmountWithCurrency;
  allParties: AmountWithCurrency;
};

export type ExchangedIncome = {
  t: Income;
  ownShare: AmountWithCurrency;
  allParties: AmountWithCurrency;
};

export class ExchangedTransactions {
  constructor(
    private readonly _interval: Interval,
    private readonly _exchanged: ExchangedTransaction[],
    private readonly _currency: Currency
  ) {
    for (const {ownShare, allParties} of _exchanged) {
      assert(
        ownShare.getCurrency().code == _currency.code,
        `Want ${_currency.code}, got ${ownShare.getCurrency().code}`
      );
      assert(
        allParties.getCurrency().code == _currency.code,
        `Want ${_currency.code}, got ${allParties.getCurrency().code}`
      );
    }
  }

  currency(): Currency {
    return this._currency!;
  }

  expensesAllTime(): ExchangedExpense[] {
    const result: ExchangedExpense[] = [];
    for (const x of this._exchanged) {
      if (!isExpense(x.t)) {
        continue;
      }
      // Copy t explicitly otherwise TypeScript thinks it's not an expense.
      result.push({...x, t: x.t});
    }
    return result;
  }

  expenses(): ExchangedExpense[] {
    return this.expensesAllTime().filter(x => this.isWithinInterval(x.t));
  }

  incomeAllTime(): ExchangedIncome[] {
    const result: ExchangedIncome[] = [];
    for (const x of this._exchanged) {
      if (!isIncome(x.t)) {
        continue;
      }
      // Copy t explicitly otherwise TypeScript thinks it's not an income transaction.
      result.push({...x, t: x.t});
    }
    return result;
  }

  income(): ExchangedIncome[] {
    return this.incomeAllTime().filter(x => this.isWithinInterval(x.t));
  }

  interval() {
    return this._interval;
  }

  private isWithinInterval(t: Transaction): boolean {
    return isWithinInterval(t.timestampEpoch, this._interval);
  }
}
