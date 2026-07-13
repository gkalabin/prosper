import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {BankAccount} from '@/lib/model/BankAccount';
import {Stock} from '@/lib/model/Stock';
import {Unit, unitKey} from '@/lib/model/Unit';
import {openingBalanceAmount} from '@/lib/model/transaction/OpeningBalance';
import {
  Transaction,
  transactionUnit,
} from '@/lib/model/transaction/Transaction';
import {amountReceived, amountSent} from '@/lib/model/transaction/Transfer';
import {paidTotal} from '@/lib/model/transaction/amounts';
import {AppendMap} from '@/lib/util/AppendMap';

// The money moved in one unit by a set of transactions: how many of them
// moved this unit and their combined amount.
export type Tally = {
  count: number;
  total: AmountWithUnit;
};

// Transaction kinds which can be excluded from the net because they don't
// change how much money the user has.
export type ExcludedKind = 'Transfer' | 'ThirdPartyExpense' | 'OpeningBalance';

const EXCLUDED_KINDS: readonly ExcludedKind[] = [
  'Transfer',
  'ThirdPartyExpense',
  'OpeningBalance',
];

// The money moved by transactions of one kind that doesn't count towards
// the net.
export type Exclusion = {
  kind: ExcludedKind;
  tallies: Tally[];
};

// The signed net of money in and out, plus the money moved by transactions
// that don't count towards it.
export type Summary = {
  net: Tally[];
  exclusions: Exclusion[];
};

// Running tallies kept separately per unit.
class TallyByUnit {
  private readonly units = new Map<string, Unit>();
  private readonly totals = new AppendMap<
    string,
    {nanos: bigint; count: number}
  >((a, b) => ({nanos: a.nanos + b.nanos, count: a.count + b.count}), {
    nanos: 0n,
    count: 0,
  });

  add(unit: Unit, nanos: bigint) {
    const key = unitKey(unit);
    this.units.set(key, unit);
    this.totals.increment(key, {nanos, count: 1});
  }

  tallies(): Tally[] {
    return [...this.units].map(([key, unit]) => {
      const {nanos, count} = this.totals.getOrZero(key);
      return {
        count,
        total: new AmountWithUnit({amountNanos: nanos, unit}),
      };
    });
  }
}

// Sums up the money moved by the transactions. Without a perspective the net
// spans all accounts, so transfers between them are excluded; with one, the
// net is for that account alone and transfers to and from it count.
export function summarize(
  transactions: Transaction[],
  bankAccounts: BankAccount[],
  stocks: Stock[],
  perspective?: BankAccount
): Summary {
  const net = new TallyByUnit();
  const excluded = {
    Transfer: new TallyByUnit(),
    ThirdPartyExpense: new TallyByUnit(),
    OpeningBalance: new TallyByUnit(),
  };
  for (const t of transactions) {
    switch (t.kind) {
      case 'Income':
        net.add(transactionUnit(t, bankAccounts, stocks), t.amountNanos);
        break;
      case 'PersonalExpense':
        net.add(transactionUnit(t, bankAccounts, stocks), -t.amountNanos);
        break;
      case 'Transfer': {
        if (!perspective) {
          const sent = amountSent(t, bankAccounts, stocks);
          excluded.Transfer.add(sent.getUnit(), sent.nanos());
          break;
        }
        if (t.toAccountId == perspective.id) {
          const received = amountReceived(t, bankAccounts, stocks);
          net.add(received.getUnit(), received.nanos());
          break;
        }
        if (t.fromAccountId == perspective.id) {
          const sent = amountSent(t, bankAccounts, stocks);
          net.add(sent.getUnit(), -sent.nanos());
          break;
        }
        throw new Error(
          `Transfer ${t.id} (${t.fromAccountId} -> ${t.toAccountId}) ` +
            `doesn't touch account ${perspective.id}`
        );
      }
      case 'ThirdPartyExpense': {
        const paid = paidTotal(t, bankAccounts, stocks);
        excluded.ThirdPartyExpense.add(paid.getUnit(), paid.nanos());
        break;
      }
      case 'OpeningBalance': {
        const opening = openingBalanceAmount(t, bankAccounts, stocks);
        excluded.OpeningBalance.add(opening.getUnit(), opening.nanos());
        break;
      }
    }
  }
  return {
    net: net.tallies(),
    exclusions: EXCLUDED_KINDS.map(kind => ({
      kind,
      tallies: excluded[kind].tallies(),
    })).filter(({tallies}) => tallies.length > 0),
  };
}
