import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {assert} from '@/lib/assert';
import {Currency} from '@/lib/model/Currency';
import {Expense} from '@/lib/model/transactionNEW/Expense';
import {Income} from '@/lib/model/transactionNEW/Income';
import {Transaction} from '@/lib/model/transactionNEW/Transaction';
import {Transfer} from '@/lib/model/transactionNEW/Transfer';
import {isWithinInterval, type Interval} from 'date-fns';

export type TransactionWithAmount = {
  t: Transaction;
  a: AmountWithCurrency;
};

export type ExchangedTransaction = {
  t: Transaction;
  ownShare: AmountWithCurrency;
  allParties: AmountWithCurrency;
};

export type ExchangedTransfer = {
  t: Transfer;
  // Moving money between accounts results in net zero change.
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

  expenses(): ExchangedExpense[] {
    const result: ExchangedExpense[] = [];
    for (const x of this._exchanged) {
      if (x.t.kind !== 'EXPENSE') {
        continue;
      }
      // Copy t explicitly otherwise TypeScript thinks it's not an expense.
      result.push({...x, t: x.t});
    }
    return result;
  }

  income(): ExchangedIncome[] {
    const result: ExchangedIncome[] = [];
    for (const x of this._exchanged) {
      if (x.t.kind !== 'INCOME') {
        continue;
      }
      // Copy t explicitly otherwise TypeScript thinks it's not an income transaction.
      result.push({...x, t: x.t});
    }
    return result;
  }

  transactions(): ExchangedTransaction[] {
    return [...this._exchanged];
  }
}

export class ExchangedIntervalTransactions extends ExchangedTransactions {
  private readonly _interval: Interval;

  constructor(
    _interval: Interval,
    _exchanged: ExchangedTransaction[],
    _currency: Currency
  ) {
    super(_exchanged, _currency);
    this._interval = _interval;
  }

  expensesAllTime(): ExchangedExpense[] {
    return super.expenses();
  }

  expenses(): ExchangedExpense[] {
    return this.expensesAllTime().filter(x => this.isWithinInterval(x.t));
  }

  incomeAllTime(): ExchangedIncome[] {
    return super.income();
  }

  income(): ExchangedIncome[] {
    return this.incomeAllTime().filter(x => this.isWithinInterval(x.t));
  }

  transfers(): ExchangedTransfer[] {
    return this.transactions()
      .map(({t}) => t)
      .filter((t): t is Transfer => t.kind === 'TRANSFER')
      .map(t => ({t}));
  }

  interval() {
    return this._interval;
  }

  private isWithinInterval(t: Transaction): boolean {
    return isWithinInterval(t.timestampEpoch, this._interval);
  }
}
