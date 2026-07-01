import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {StockAndCurrencyExchange} from '@/lib/ClientSideModel';
import {BankAccount, accountUnit} from '@/lib/model/BankAccount';
import {Currency} from '@/lib/model/Currency';
import {Stock} from '@/lib/model/Stock';
import {OpeningBalance} from '@/lib/model/transaction/OpeningBalance';
import {
  Transaction,
  isOpeningBalance,
} from '@/lib/model/transaction/Transaction';
import {nanosAppendMap} from '@/lib/util/AppendMap';
import {evenlySpacedNumbers} from '@/lib/util/util';

// How a single transaction changes the nano balances of the accounts it touches.
function balanceEffects(
  t: Exclude<Transaction, OpeningBalance>
): Array<{accountId: number; deltaNanos: bigint}> {
  switch (t.kind) {
    case 'Income':
      return [{accountId: t.accountId, deltaNanos: t.amountNanos}];
    case 'PersonalExpense':
      return [{accountId: t.accountId, deltaNanos: -t.amountNanos}];
    case 'ThirdPartyExpense':
      return [];
    case 'Transfer':
      return [
        {accountId: t.fromAccountId, deltaNanos: -t.sentAmountNanos},
        {accountId: t.toAccountId, deltaNanos: t.receivedAmountNanos},
      ];
    default:
      const _exhaustiveCheck: never = t;
      throw new Error(`Unknown transaction kind ${_exhaustiveCheck}`);
  }
}

// Every account's native-unit balance at a single instant.
export class AccountBalancesSnapshot {
  private readonly asOf: number;
  private readonly nanos: Map<number, bigint>;
  private readonly stocks: Stock[];

  constructor(asOf: number, nanos: Map<number, bigint>, stocks: Stock[]) {
    this.asOf = asOf;
    this.nanos = nanos;
    this.stocks = stocks;
  }

  of(account: BankAccount): AmountWithUnit {
    return new AmountWithUnit({
      amountNanos: this.nanos.get(account.id) ?? 0n,
      unit: accountUnit(account, this.stocks),
    });
  }

  // Total value of the given accounts in the target currency. Returns undefined
  // when any account's balance cannot be converted for this snapshot's date.
  sum(
    accounts: BankAccount[],
    target: Currency,
    exchange: StockAndCurrencyExchange
  ): AmountWithCurrency | undefined {
    let sum = AmountWithCurrency.zero(target);
    for (const account of accounts) {
      const value = exchange.exchange(this.of(account), target, this.asOf);
      if (!value) {
        return undefined;
      }
      sum = sum.add(value);
    }
    return sum;
  }
}

export class BalanceSweep {
  private readonly sorted: Array<Exclude<Transaction, OpeningBalance>>;
  private readonly stocks: Stock[];
  private readonly nanos = nanosAppendMap();
  private cursor = 0;
  private lastAsOf = -Infinity;

  // An opening balance records the account's state before any of its activity,
  // so it seeds the balances upfront regardless of when it was recorded; only
  // the remaining transactions are replayed over time.
  constructor(transactions: Transaction[], stocks: Stock[]) {
    this.stocks = stocks;
    this.sorted = [];
    for (const t of transactions) {
      if (isOpeningBalance(t)) {
        this.nanos.increment(t.accountId, t.amountNanos);
      } else {
        this.sorted.push(t);
      }
    }
    this.sorted.sort((a, b) => a.timestampEpoch - b.timestampEpoch);
  }

  // Snapshot including every transaction at or before `asOf`. Callers must pass
  // non-decreasing `asOf` values; each call resumes where the previous stopped.
  advanceTo(asOf: number): AccountBalancesSnapshot {
    if (asOf < this.lastAsOf) {
      throw new Error(
        `advanceTo requires non-decreasing asOf, got ${asOf} after ${this.lastAsOf}`
      );
    }
    this.lastAsOf = asOf;
    while (
      this.cursor < this.sorted.length &&
      this.sorted[this.cursor].timestampEpoch <= asOf
    ) {
      for (const {accountId, deltaNanos} of balanceEffects(
        this.sorted[this.cursor]
      )) {
        this.nanos.increment(accountId, deltaNanos);
      }
      this.cursor++;
    }
    return new AccountBalancesSnapshot(asOf, new Map(this.nanos), this.stocks);
  }
}

// Snapshot of every account's balance as of `asOf` epoch ms.
export function balancesAsOf(
  transactions: Transaction[],
  stocks: Stock[],
  asOf: number
): AccountBalancesSnapshot {
  return new BalanceSweep(transactions, stocks).advanceTo(asOf);
}

// Net worth converted to the target currency, sampled at `sampleCount` evenly
// spaced points across [start, end]. A point is omitted when any account's
// balance cannot be converted for that date.
export function netWorthTimeline(
  accounts: BankAccount[],
  targetCurrency: Currency,
  exchange: StockAndCurrencyExchange,
  allTransactions: Transaction[],
  stocks: Stock[],
  range: {start: number; end: number},
  sampleCount: number
): Array<{timestamp: number; amount: AmountWithCurrency}> {
  const sweep = new BalanceSweep(allTransactions, stocks);
  const points: Array<{timestamp: number; amount: AmountWithCurrency}> = [];
  for (const sampleDate of evenlySpacedNumbers(range, sampleCount)) {
    const total = sweep
      .advanceTo(sampleDate)
      .sum(accounts, targetCurrency, exchange);
    if (total) {
      points.push({timestamp: sampleDate, amount: total});
    }
  }
  return points;
}
