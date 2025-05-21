import {
  AccountOwnership,
  AccountType,
  accountUnitId,
} from '@/lib/model/Account';
import {TransactionNEWWithTagIds} from '@/lib/model/AllDatabaseDataModel';
import {abs, subtract} from '@/lib/model/Amount';
import {AccountBalanceUpdate} from '@/lib/model/transactionNEW/AccountBalanceUpdate';
import {
  counterpartyAndCategoryFromLines,
  fullPayerAmountFromLines,
} from '@/lib/model/transactionNEW/LinesParsing';
import {modelError} from '@/lib/model/transactionNEW/ModelParsingError';
import {TransactionLineNEW as DBTransactionLine} from '@prisma/client';
import {Categorisation} from './Categorisation';

export type Expense = {
  kind: 'EXPENSE';
  transactionId: number;
  timestampEpoch: number;
  note: string;
  vendor: string; // Who was paid in this expense, e.g. Starbucks
  categorisation: Categorisation;
  balanceUpdates: AccountBalanceUpdate[];
  tagsIds: number[];
  tripId: number | null;
};

export function newExpense({
  dbTransaction,
  lines,
  expense,
  asset,
}: {
  dbTransaction: TransactionNEWWithTagIds;
  lines: DBTransactionLine[];
  expense: AccountBalanceUpdate;
  asset: AccountBalanceUpdate;
}): Expense {
  const updates = [expense, asset];
  const expenseLines = lines.filter(l => l.accountId == expense.account.id);
  if (expenseLines.length == 0) {
    return modelError(dbTransaction, lines, updates);
  }
  const {counterparty: vendor, categoryId} = counterpartyAndCategoryFromLines({
    dbTransaction,
    unsortedLines: expenseLines,
    allLines: lines,
    updates,
  });
  const amount = abs(asset.delta);
  return {
    kind: 'EXPENSE',
    transactionId: dbTransaction.id,
    timestampEpoch: new Date(dbTransaction.timestamp).getTime(),
    vendor,
    categorisation: {
      categoryId,
      unitId: accountUnitId(asset.account),
      userShare: amount,
      companion: null,
    },
    balanceUpdates: updates,
    note: dbTransaction.description,
    tagsIds: dbTransaction.tags.map(t => t.id),
    tripId: dbTransaction.tripId,
  };
}

export function newSharedExpense({
  dbTransaction,
  lines,
  credit,
  debits,
}: {
  dbTransaction: TransactionNEWWithTagIds;
  lines: DBTransactionLine[];
  credit: AccountBalanceUpdate;
  debits: AccountBalanceUpdate[];
}): Expense {
  const updates = [credit, ...debits];
  if (credit.account.ownership == AccountOwnership.OWNED_BY_OTHER) {
    return modelError(
      dbTransaction,
      lines,
      updates,
      'Payment should be made from an owned account'
    );
  }
  const ownExpense = debits.find(x => x.account.type == AccountType.EXPENSE);
  const thirdPartyExpense = debits.find(
    x => x.account.ownership == AccountOwnership.OWNED_BY_OTHER
  );
  if (!ownExpense || !thirdPartyExpense) {
    return modelError(dbTransaction, lines, updates);
  }
  const expenseLines = lines.filter(l => l.accountId == ownExpense.account.id);
  const {counterparty: vendor, categoryId} = counterpartyAndCategoryFromLines({
    dbTransaction,
    unsortedLines: expenseLines,
    allLines: lines,
    updates,
  });
  return {
    kind: 'EXPENSE',
    transactionId: dbTransaction.id,
    timestampEpoch: new Date(dbTransaction.timestamp).getTime(),
    vendor,
    categorisation: {
      categoryId,
      unitId: accountUnitId(credit.account),
      userShare: abs(ownExpense.delta),
      companion: {
        accountId: thirdPartyExpense.account.id,
        share: abs(thirdPartyExpense.delta),
      },
    },
    balanceUpdates: updates,
    note: dbTransaction.description,
    tagsIds: dbTransaction.tags.map(t => t.id),
    tripId: dbTransaction.tripId,
  };
}

export function newUserPaidForSomeoneExpense({
  dbTransaction,
  lines,
  liability,
  asset,
}: {
  dbTransaction: TransactionNEWWithTagIds;
  lines: DBTransactionLine[];
  liability: AccountBalanceUpdate;
  asset: AccountBalanceUpdate;
}): Expense {
  const updates = [liability, asset];
  const liabilityLines = lines.filter(l => l.accountId == liability.account.id);
  if (liabilityLines.length == 0) {
    return modelError(dbTransaction, lines, updates);
  }
  const {counterparty: vendor, categoryId} = counterpartyAndCategoryFromLines({
    dbTransaction,
    unsortedLines: liabilityLines,
    allLines: lines,
    updates,
  });
  return {
    kind: 'EXPENSE',
    transactionId: dbTransaction.id,
    timestampEpoch: new Date(dbTransaction.timestamp).getTime(),
    vendor,
    categorisation: {
      categoryId,
      unitId: accountUnitId(asset.account),
      userShare: {cents: 0},
      companion: {
        accountId: liability.account.id,
        share: abs(liability.delta),
      },
    },
    balanceUpdates: updates,
    note: dbTransaction.description,
    tagsIds: dbTransaction.tags.map(t => t.id),
    tripId: dbTransaction.tripId,
  };
}

export function newSomeonePaidForUserExpense({
  dbTransaction,
  lines,
  expense,
  liability,
}: {
  dbTransaction: TransactionNEWWithTagIds;
  lines: DBTransactionLine[];
  expense: AccountBalanceUpdate;
  liability: AccountBalanceUpdate;
}): Expense {
  const updates = [liability, expense];
  const expenseLines = lines.filter(l => l.accountId == expense.account.id);
  if (expenseLines.length == 0) {
    return modelError(dbTransaction, lines, updates);
  }
  const {counterparty: vendor, categoryId} = counterpartyAndCategoryFromLines({
    dbTransaction,
    unsortedLines: expenseLines,
    allLines: lines,
    updates,
  });
  const liabilityLines = lines.filter(l => l.accountId == liability.account.id);
  if (liabilityLines.length == 0) {
    return modelError(dbTransaction, lines, updates);
  }
  const fullPayerAmount = fullPayerAmountFromLines({
    dbTransaction,
    unsortedLines: liabilityLines,
    allLines: lines,
    updates,
  });
  return {
    kind: 'EXPENSE',
    transactionId: dbTransaction.id,
    timestampEpoch: new Date(dbTransaction.timestamp).getTime(),
    vendor,
    categorisation: {
      categoryId,
      unitId: accountUnitId(liability.account),
      userShare: abs(expense.delta),
      companion: {
        accountId: liability.account.id,
        share: subtract(fullPayerAmount, expense.delta),
      },
    },
    balanceUpdates: updates,
    note: dbTransaction.description,
    tagsIds: dbTransaction.tags.map(t => t.id),
    tripId: dbTransaction.tripId,
  };
}
