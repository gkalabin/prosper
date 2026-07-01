import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {StockAndCurrencyExchange} from '@/lib/ClientSideModel';
import {BankAccount} from '@/lib/model/BankAccount';
import {Currency, mustFindByCode} from '@/lib/model/Currency';
import {
  AccountBalancesSnapshot,
  BalanceSweep,
  balancesAsOf,
  netWorthTimeline,
} from '@/lib/model/balances';
import {Transaction} from '@/lib/model/transaction/Transaction';

const USD = mustFindByCode('USD');
let nextTransactionId = 1;

function usdAccount(id: number): BankAccount {
  return {id, currencyCode: USD.code} as unknown as BankAccount;
}

function opening(accountId: number, nanos: bigint, at: number) {
  return {
    kind: 'OpeningBalance',
    id: nextTransactionId++,
    timestampEpoch: at,
    accountId,
    amountNanos: nanos,
  } as Transaction;
}

function expense(accountId: number, nanos: bigint, at: number) {
  return {
    kind: 'PersonalExpense',
    id: nextTransactionId++,
    timestampEpoch: at,
    accountId,
    amountNanos: nanos,
  } as Transaction;
}

function transfer(
  fromAccountId: number,
  toAccountId: number,
  sent: bigint,
  received: bigint,
  at: number
) {
  return {
    kind: 'Transfer',
    id: nextTransactionId++,
    timestampEpoch: at,
    fromAccountId,
    toAccountId,
    sentAmountNanos: sent,
    receivedAmountNanos: received,
  } as Transaction;
}

// Nanos of the target currency, treating every unit as already in it.
const passthroughExchange = {
  exchange: (amount: AmountWithUnit, target: Currency) =>
    new AmountWithCurrency({amountNanos: amount.nanos(), currency: target}),
} as unknown as StockAndCurrencyExchange;

const A = usdAccount(1);
const B = usdAccount(2);
const txs: Transaction[] = [
  // Account A.
  opening(A.id, 1000n, 100),
  expense(A.id, 300n, 200),
  transfer(A.id, B.id, 200n, 200n, 300),
  expense(B.id, 50n, 400),
  // Account B.
  opening(B.id, 500n, 100),
];

function nanos(
  balances: AccountBalancesSnapshot,
  account: BankAccount
): bigint {
  return balances.of(account).nanos();
}

describe('balancesAsOf', () => {
  it('accumulates effects up to and including the cutoff', () => {
    // Opening balances apply before any activity.
    expect(nanos(balancesAsOf(txs, [], 50), A)).toBe(1000n);
    expect(nanos(balancesAsOf(txs, [], 50), B)).toBe(500n);
    // Account A opening balance only.
    expect(nanos(balancesAsOf(txs, [], 100), A)).toBe(1000n);
    // Account A opening balance minus expense.
    expect(nanos(balancesAsOf(txs, [], 200), A)).toBe(700n);
    // Account A opening balance minus expense and minus transfer.
    expect(nanos(balancesAsOf(txs, [], 300), A)).toBe(500n);
    // Account B opening balance plus transfer.
    expect(nanos(balancesAsOf(txs, [], 300), B)).toBe(700n);
    // Account B opening balance plus transfer minus expense.
    expect(nanos(balancesAsOf(txs, [], 400), B)).toBe(650n);
  });
});

describe('BalanceSweep', () => {
  // The incremental monotonic sweep must agree with an independent full
  // snapshot at every cutoff.
  it('matches a fresh snapshot at each advancing cutoff', () => {
    const sweep = new BalanceSweep(txs, []);
    for (const cutoff of [50, 100, 200, 300, 400, 500]) {
      const swept = sweep.advanceTo(cutoff);
      const snapshot = balancesAsOf(txs, [], cutoff);
      expect(nanos(swept, A)).toBe(nanos(snapshot, A));
      expect(nanos(swept, B)).toBe(nanos(snapshot, B));
    }
  });
});

describe('netWorthTimeline', () => {
  it("ends at the snapshot sum for the range's end", () => {
    const end = 500;
    const timeline = netWorthTimeline(
      [A, B],
      USD,
      passthroughExchange,
      txs,
      [],
      {start: 100, end},
      8
    );
    const snapshotSum = balancesAsOf(txs, [], end).sum(
      [A, B],
      USD,
      passthroughExchange
    );
    expect(timeline[timeline.length - 1].amount.nanos()).toBe(
      snapshotSum!.nanos()
    );
  });
});
