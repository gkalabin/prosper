import {assert, assertDefined} from '@/lib/assert';
import {uniqMostFrequent} from '@/lib/collections';
import {
  Account,
  AccountOwnership,
  AccountType,
  mustFindAccount,
} from '@/lib/model/Account';
import {TransactionNEWWithTagIds} from '@/lib/model/AllDatabaseDataModel';
import {AccountBalanceUpdate} from '@/lib/model/transactionNEW/AccountBalanceUpdate';
import {
  InitialBalance,
  newInitialBalance,
} from '@/lib/model/transactionNEW/InitialBalance';
import {counterpartyAndCategoryFromLines} from '@/lib/model/transactionNEW/LinesParsing';
import {modelError} from '@/lib/model/transactionNEW/ModelParsingError';
import {TransactionCompanion} from '@/lib/model/transactionNEW/TransactionCompanion';
import {newTransfer, Transfer} from '@/lib/model/transactionNEW/Transfer';
import {numberAppendMap} from '@/lib/util/AppendMap';
import {TransactionLineNEW as DBTransactionLine} from '@prisma/client';

export type Transaction = Expense | Income | Transfer | Noop | InitialBalance;

export type Noop = {
  kind: 'NOOP';
  transactionId: number;
  timestampEpoch: number;
  counterparty: string;
  note: string;
  tagsIds: number[];
  tripId: number | null;
  accountIds: number[];
};

export type Expense = {
  kind: 'EXPENSE';
  transactionId: number;
  timestampEpoch: number;
  vendor: string;
  amountCents: number;
  companions: TransactionCompanion[];
  note: string;
  accountId: number;
  categoryId: number;
  tagsIds: number[];
  tripId: number | null;
  refundIds: number[];
};

export type Income = {
  kind: 'INCOME';
  transactionId: number;
  timestampEpoch: number;
  payer: string;
  amountCents: number;
  companions: TransactionCompanion[];
  note: string;
  accountId: number;
  categoryId: number;
  tagsIds: number[];
  tripId: number | null;
};

const NO_COMPANIONS: TransactionCompanion[] = [];

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
  for (const [accountId, delta] of maybeEmptyUpdates.entries()) {
    if (delta == 0) {
      continue;
    }
    const account = mustFindAccount(accounts, accountId);
    balanceUpates.push({account, delta});
  }
  const totalDelta = balanceUpates.reduce((acc, x) => acc + x.delta, 0);
  if (totalDelta != 0 && sameAccountsUnits(balanceUpates)) {
    return modelError(
      dbTransaction,
      lines,
      balanceUpates,
      `Debit != credit, delta: ${totalDelta}`
    );
  }
  if (balanceUpates.length == 0) {
    return noopTransaction({dbTransaction, lines});
  }
  if (balanceUpates.length == 2) {
    const debit = balanceUpates.find(x => x.delta > 0);
    const credit = balanceUpates.find(x => x.delta < 0);
    if (!debit || !credit) {
      return modelError(
        dbTransaction,
        lines,
        balanceUpates,
        `Need exactly one debit and one credit`
      );
    }
    assertDefined(debit, `Debit account is not found for transaction ${tid}`);
    assertDefined(credit, `Credit account is not found for transaction ${tid}`);
    return twoWayTransaction({debit, credit, dbTransaction, lines});
  }
  if (balanceUpates.length == 3) {
    const debits = balanceUpates.filter(x => x.delta > 0);
    const credits = balanceUpates.filter(x => x.delta < 0);
    return threeWayTransaction({debits, credits, dbTransaction, lines});
  }
  return modelError(dbTransaction, lines, balanceUpates);
}

function noopTransaction({
  dbTransaction,
  lines,
}: {
  dbTransaction: TransactionNEWWithTagIds;
  lines: DBTransactionLine[];
}): Noop {
  const {counterparty} = counterpartyAndCategoryFromLines({
    dbTransaction,
    unsortedLines: lines,
    allLines: lines,
    updates: [],
  });
  const accountIds = uniqMostFrequent(lines.map(l => l.accountId));
  return {
    kind: 'NOOP',
    transactionId: dbTransaction.id,
    timestampEpoch: new Date(dbTransaction.timestamp).getTime(),
    counterparty,
    note: dbTransaction.description,
    tagsIds: dbTransaction.tags.map(t => t.id),
    tripId: dbTransaction.tripId,
    accountIds,
  };
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

function newSharedExpense({
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
    amountCents: Math.abs(credit.delta),
    companions: [
      {
        name: thirdPartyExpense.account.name,
        accountId: thirdPartyExpense.account.id,
        amountCents: Math.abs(thirdPartyExpense.delta),
      },
    ],
    note: dbTransaction.description,
    accountId: credit.account.id,
    categoryId,
    tagsIds: dbTransaction.tags.map(t => t.id),
    tripId: dbTransaction.tripId,
    // TODO: add refundIds
    refundIds: [],
  };
}

function newSharedIncome({
  dbTransaction,
  lines,
  credits,
  debit,
}: {
  dbTransaction: TransactionNEWWithTagIds;
  lines: DBTransactionLine[];
  credits: AccountBalanceUpdate[];
  debit: AccountBalanceUpdate;
}): Income {
  const updates = [...credits, debit];
  if (debit.account.ownership == AccountOwnership.OWNED_BY_OTHER) {
    return modelError(
      dbTransaction,
      lines,
      updates,
      'Payment should be made to an owned account'
    );
  }
  const income = credits.find(x => x.account.type == AccountType.INCOME);
  const thirdPartyLine = credits.find(
    x => x.account.ownership == AccountOwnership.OWNED_BY_OTHER
  );
  if (!income || !thirdPartyLine) {
    return modelError(dbTransaction, lines, updates);
  }
  const incomeLines = lines.filter(l => l.accountId == income.account.id);
  const {counterparty: payer, categoryId} = counterpartyAndCategoryFromLines({
    dbTransaction,
    unsortedLines: incomeLines,
    allLines: lines,
    updates,
  });
  return {
    kind: 'INCOME',
    transactionId: dbTransaction.id,
    timestampEpoch: new Date(dbTransaction.timestamp).getTime(),
    payer,
    amountCents: Math.abs(debit.delta),
    companions: [
      {
        name: thirdPartyLine.account.name,
        accountId: thirdPartyLine.account.id,
        amountCents: Math.abs(thirdPartyLine.delta),
      },
    ],
    note: dbTransaction.description,
    accountId: debit.account.id,
    categoryId,
    tagsIds: dbTransaction.tags.map(t => t.id),
    tripId: dbTransaction.tripId,
  };
}

function newExpense({
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
    return modelError(dbTransaction, lines, updates, 'Expense lines not found');
  }
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
    amountCents: Math.abs(expense.delta),
    companions: NO_COMPANIONS,
    note: dbTransaction.description,
    accountId: asset.account.id,
    categoryId,
    tagsIds: dbTransaction.tags.map(t => t.id),
    tripId: dbTransaction.tripId,
    // TODO: add refundIds
    refundIds: [],
  };
}

function newIncome({
  dbTransaction,
  lines,
  income,
  asset,
}: {
  dbTransaction: TransactionNEWWithTagIds;
  lines: DBTransactionLine[];
  income: AccountBalanceUpdate;
  asset: AccountBalanceUpdate;
}): Income {
  const updates = [income, asset];
  const unsortedLines = lines.filter(l => l.accountId == income.account.id);
  if (unsortedLines.length == 0) {
    return modelError(dbTransaction, lines, updates, 'Income lines not found');
  }
  const {counterparty: payer, categoryId} = counterpartyAndCategoryFromLines({
    dbTransaction,
    unsortedLines,
    allLines: lines,
    updates,
  });
  return {
    kind: 'INCOME',
    transactionId: dbTransaction.id,
    timestampEpoch: new Date(dbTransaction.timestamp).getTime(),
    payer,
    amountCents: Math.abs(income.delta),
    companions: NO_COMPANIONS,
    note: dbTransaction.description,
    accountId: asset.account.id,
    categoryId,
    tagsIds: dbTransaction.tags.map(t => t.id),
    tripId: dbTransaction.tripId,
  };
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
