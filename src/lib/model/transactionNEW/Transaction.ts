import {assert, assertDefined} from '@/lib/assert';
import {uniqMostFrequent} from '@/lib/collections';
import {Account, AccountType, mustFindAccount} from '@/lib/model/Account';
import {TransactionNEWWithTagIds} from '@/lib/model/AllDatabaseDataModel';
import {add} from '@/lib/model/Amount';
import {AccountBalanceUpdate} from '@/lib/model/transactionNEW/AccountBalanceUpdate';
import {
  Expense,
  newExpense,
  newSharedExpense,
  newSomeonePaidForUserExpense,
  newUserPaidForSomeoneExpense,
} from '@/lib/model/transactionNEW/Expense';
import {
  Income,
  newIncome,
  newSharedIncome,
} from '@/lib/model/transactionNEW/Income';
import {
  InitialBalance,
  newInitialBalance,
} from '@/lib/model/transactionNEW/InitialBalance';
import {modelError} from '@/lib/model/transactionNEW/ModelParsingError';
import {newNoopTransaction, Noop} from '@/lib/model/transactionNEW/Noop';
import {newTransfer, Transfer} from '@/lib/model/transactionNEW/Transfer';
import {numberAppendMap} from '@/lib/util/AppendMap';
import {TransactionLineNEW as DBTransactionLine} from '@prisma/client';

export type Transaction = Expense | Income | Transfer | Noop | InitialBalance;

export function fromDB({
  dbTransaction,
  dbLines,
  accounts,
}: {
  dbTransaction: TransactionNEWWithTagIds;
  dbLines: DBTransactionLine[];
  accounts: Account[];
}): Transaction {
  const tid = dbTransaction.id;
  const lines = dbLines.filter(l => l.transactionId == tid);
  assert(lines.length > 0, `Transaction ${tid} has no lines`);
  const maybeEmptyUpdates = numberAppendMap<number>();
  for (const l of lines) {
    maybeEmptyUpdates.increment(l.accountId, lineBalance(l));
  }
  const balanceUpates: Array<AccountBalanceUpdate> = [];
  for (const [accountId, deltaCents] of maybeEmptyUpdates.entries()) {
    if (deltaCents == 0) {
      continue;
    }
    const account = mustFindAccount(accounts, accountId);
    const delta = {cents: deltaCents};
    balanceUpates.push({account, delta});
  }
  const totalDelta = balanceUpates.reduce((acc, x) => add(acc, x.delta), {
    cents: 0,
  });
  if (totalDelta.cents != 0 && sameAccountsUnits(balanceUpates)) {
    return modelError(
      dbTransaction,
      lines,
      balanceUpates,
      `Debit != credit, delta: ${totalDelta}`
    );
  }
  if (balanceUpates.length == 0) {
    return newNoopTransaction({dbTransaction, lines});
  }
  const debits = balanceUpates.filter(x => x.delta.cents > 0);
  const credits = balanceUpates.filter(x => x.delta.cents < 0);
  if (balanceUpates.length == 2) {
    const debit = debits[0];
    const credit = credits[0];
    assertDefined(debit, `Debit account is not found for transaction ${tid}`);
    assertDefined(credit, `Credit account is not found for transaction ${tid}`);
    return twoWayTransaction({debit, credit, dbTransaction, lines});
  }
  if (balanceUpates.length == 3) {
    return threeWayTransaction({debits, credits, dbTransaction, lines});
  }
  return modelError(dbTransaction, lines, balanceUpates);
}

function twoWayTransaction({
  dbTransaction,
  lines,
  debit,
  credit,
}: {
  dbTransaction: TransactionNEWWithTagIds;
  lines: DBTransactionLine[];
  debit: AccountBalanceUpdate;
  credit: AccountBalanceUpdate;
}) {
  if (
    debit.account.type == AccountType.EXPENSE &&
    credit.account.type == AccountType.ASSET
  ) {
    return newExpense({
      dbTransaction,
      lines,
      expense: debit,
      asset: credit,
    });
  }
  // Paid for someone else,
  // money going from own account (ASSET) to the IOU account (LIABILITY).
  if (
    debit.account.type == AccountType.LIABILITY &&
    credit.account.type == AccountType.ASSET
  ) {
    return newUserPaidForSomeoneExpense({
      dbTransaction,
      lines,
      liability: debit,
      asset: credit,
    });
  }
  // Someone paid for the user,
  // the user's share of the expense is debited and
  // the IOU account of the other party is credited (so they owe less).
  if (
    debit.account.type == AccountType.EXPENSE &&
    credit.account.type == AccountType.LIABILITY
  ) {
    return newSomeonePaidForUserExpense({
      dbTransaction,
      lines,
      expense: debit,
      liability: credit,
    });
  }
  if (
    debit.account.type == AccountType.ASSET &&
    credit.account.type == AccountType.INCOME
  ) {
    return newIncome({
      dbTransaction,
      lines,
      income: credit,
      asset: debit,
    });
  }
  if (
    debit.account.type == AccountType.ASSET &&
    credit.account.type == AccountType.ASSET
  ) {
    return newTransfer({
      dbTransaction,
      lines,
      debit,
      credit,
    });
  }
  if (
    (debit.account.type == AccountType.ASSET &&
      credit.account.type == AccountType.EQUITY) ||
    (credit.account.type == AccountType.ASSET &&
      debit.account.type == AccountType.EQUITY)
  ) {
    return newInitialBalance({
      dbTransaction,
      lines,
      debit,
      credit,
    });
  }
  return modelError(dbTransaction, lines, [debit, credit]);
}

function threeWayTransaction({
  dbTransaction,
  lines,
  debits,
  credits,
}: {
  dbTransaction: TransactionNEWWithTagIds;
  lines: DBTransactionLine[];
  debits: AccountBalanceUpdate[];
  credits: AccountBalanceUpdate[];
}) {
  // One withdrawal, but two debits (typically to a personal expense and third party accounts)
  if (debits.length == 2 && credits.length == 1) {
    return newSharedExpense({
      dbTransaction,
      lines,
      credit: credits[0],
      debits,
    });
  }
  if (debits.length == 1 && credits.length == 2) {
    return newSharedIncome({
      dbTransaction,
      lines,
      credits,
      debit: debits[0],
    });
  }
  return modelError(dbTransaction, lines, [...debits, ...credits]);
}

function lineBalance(l: DBTransactionLine): number {
  return (l.debitCents ?? 0) - (l.creditCents ?? 0);
}

function sameAccountsUnits(balanceUpates: AccountBalanceUpdate[]): boolean {
  const units = balanceUpates.map(b => {
    if (b.account.currencyCode) {
      return 'currency:' + b.account.currencyCode;
    }
    if (b.account.stockId) {
      return 'stockId:' + b.account.stockId;
    }
    throw new Error('Unknown unit id');
  });
  const u = uniqMostFrequent(units);
  return u.length == 1;
}
