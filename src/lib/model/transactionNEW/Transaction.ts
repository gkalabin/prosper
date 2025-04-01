import {assert, assertDefined} from '@/lib/assert';
import {uniqMostFrequent} from '@/lib/collections';
import {
  Account,
  AccountOwnership,
  AccountType,
  accountUnitId,
  mustFindAccount,
} from '@/lib/model/Account';
import {TransactionNEWWithTagIds} from '@/lib/model/AllDatabaseDataModel';
import {abs, AmountPlain as Amount} from '@/lib/model/Amount';
import {AccountBalanceUpdate} from '@/lib/model/transactionNEW/AccountBalanceUpdate';
import {
  InitialBalance,
  newInitialBalance,
} from '@/lib/model/transactionNEW/InitialBalance';
import {counterpartyAndCategoryFromLines} from '@/lib/model/transactionNEW/LinesParsing';
import {modelError} from '@/lib/model/transactionNEW/ModelParsingError';
import {newNoopTransaction, Noop} from '@/lib/model/transactionNEW/Noop';
import {TransactionShare} from '@/lib/model/transactionNEW/TransactionShare';
import {newTransfer, Transfer} from '@/lib/model/transactionNEW/Transfer';
import {UnitId} from '@/lib/model/Unit';
import {numberAppendMap} from '@/lib/util/AppendMap';
import {TransactionLineNEW as DBTransactionLine} from '@prisma/client';

export type Transaction = Expense | Income | Transfer | Noop | InitialBalance;

export type Expense = {
  kind: 'EXPENSE';
  transactionId: number;
  timestampEpoch: number;
  // Vendor who was paid in this expense, e.g. Starbucks.
  vendor: string;
  /**
   * * 1. Bought coffee (user paid for and consumed coffee)
   *    - self:
   *         share: $5
   *         payment: $5
   *         accountId: hsbc.id
   *    - participants: []
   *
   * 2. Bought coffee for K (user paid $10 but only consumed $5; K’s share is $5)
   *    - self:
   *         share: $5
   *         payment: $10
   *         accountId: hsbc.id
   *    - participants: [
   *         {
   *           name: "K",
   *           accountId: ownedByOtherAccounts["K"].id,
   *           share: $5,
   *           payment: $0
   *         }
   *       ]
   *
   * 3. K bought coffee for me (user consumed $5 but paid nothing; K paid $10 for her share of $5)
   *    - self:
   *         share: $5
   *         payment: $0
   *         accountId: null
   *    - participants: [
   *         {
   *           name: "K",
   *           accountId: ownedByOtherAccounts["K"].id,
   *           share: $5,
   *           payment: $10
   *         }
   *       ]
   */


  /**
   * 1.  bought coffee
   *    - amount: $5
   *    - accountId: hsbc.id
   *    - others: []
   * 
   * 2. bought coffee for K
   *    - amount: $10
   *    - accountId: hsbc.id
   *    - others: [
   *      {
   *        name: K
   *        accountId: ownedByOtherAccounts[K].id
   *        share: $5
   *      }
   *    ]
   * 
   * 3. K bought coffee for me
   *    - amount: $10
   *    - accountId: null
   *    - others: [
   *      {
   *        name: K
   *        accountId: ownedByOtherAccounts[K].id
   *        share: $5
   *      }
   *    ]
   */


  /**
   * 1.  bought coffee
   *   - ownShare: $5
   *   - ownPaid: $5
   *   - ownAccountId: hsbc.id
   *   - others: []
   * 
   * 2. bought coffee for K
   *   - ownShare: $5
   *   - ownPaid: $10
   *   - ownAccountId: hsbc.id
   *   - others: [
   *       name: K
   *       accountId: ownedByOtherAccounts[K].id
   *       share: $5
   *       paid: $0
   *     ]
   * 
   * 3. K bought coffee for me
   *   - ownShare: $5
   *   - ownPaid: $0
   *   - ownAccountId: null
   *   - others: [
   *       name: K
   *       accountId: ownedByOtherAccounts[K].id
   *       share: $5
   *       paid: $10
   *     ]
   */


  

  ownShare: Amount;
  ownPaid: Amount;
  ownAccountId: number| null;
  otherParticipants: Array<{
    name: string;
    accountId: number;
    // The companion's share in the transaction.
    // For example, if the companion paid $1000 mortgage payment and it's shared with the user, the companionShare is $500.
    share: Amount;
    // The amount that actually cleared (received or paid) on their account. For example, how much they paid
    paid: Amount;
  }>;

  note: string;
  categoryId: number;
  tagsIds: number[];
  tripId: number | null;
};

export type Income = {
  kind: 'INCOME';
  transactionId: number;
  timestampEpoch: number;
  unitId: UnitId;
  // Whoever sent the money as a part of this transaction.
  payer: string;
  // The amount that the sender transferred from their bank account.
  sentByPayer: Amount;
  // Your allocated share of the income.
  ownTransactionAmount: Amount;
  // The actual amount that was received by the user
  actuallyReceivedOnOwnAccount: Amount;
  // Details for other participants’ shares.
  participantShares: TransactionShare[];
  note: string;
  accountId: number;
  categoryId: number;
  tagsIds: number[];
  tripId: number | null;
};

const NOT_SHARED: Array<{
  name: string;
  accountId: number;
  share: Amount;
  paid: Amount;
}> = [];

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
    return newNoopTransaction({dbTransaction, lines});
  }
  if (dbTransaction.id == 14164) {
    console.log(JSON.stringify(dbTransaction, null, 2));
    console.log(JSON.stringify(lines, null, 2));
    console.log(JSON.stringify(balanceUpates, null, 2));
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
    return newSharedPersonalExpense({
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

function newSharedPersonalExpense({
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
    ownPaid: abs({cents: credit.delta}),
    ownShare: abs({cents: ownExpense.delta}),
    ownAccountId: credit.account.id,
    otherParticipants: [
      {
        name: thirdPartyExpense.account.name,
        accountId: thirdPartyExpense.account.id,
        share: abs({cents: thirdPartyExpense.delta}),
        paid: {cents: 0},
      },
    ],
    note: dbTransaction.description,
    categoryId,
    tagsIds: dbTransaction.tags.map(t => t.id),
    tripId: dbTransaction.tripId,
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
    unitId: accountUnitId(debit.account),
    payer,
    sentByPayer: abs({cents: debit.delta}),
    ownTransactionAmount: abs({cents: income.delta}),
    actuallyReceivedOnOwnAccount: abs({cents: debit.delta}),
    participantShares: [
      {
        name: thirdPartyLine.account.name,
        accountId: thirdPartyLine.account.id,
        companionShare: abs({cents: thirdPartyLine.delta}),
        transactedAmount: {cents: 0},
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
    return modelError(dbTransaction, lines, updates);
  }
  const {counterparty: vendor, categoryId} = counterpartyAndCategoryFromLines({
    dbTransaction,
    unsortedLines: expenseLines,
    allLines: lines,
    updates,
  });
  const amount = abs({cents: expense.delta});
  if (asset.account.ownership == AccountOwnership.OWNED_BY_OTHER) {
    if (true) return modelError(dbTransaction, lines, updates);
    return {
      kind: 'EXPENSE',
      transactionId: dbTransaction.id,
      timestampEpoch: new Date(dbTransaction.timestamp).getTime(),
      vendor,
      ownPaid: {cents: 0},
      // TODO: this is wrong.
      // TODO: this is wrong.
      // TODO: this is wrong.
      // TODO: this is wrong.
      // TODO: this is wrong.
      // TODO: this is wrong.
      // TODO: this is wrong.
      // TODO: this is wrong.
      // TODO: this is wrong.
      ownShare: abs({cents: Math.floor(expense.delta / 2)}),
      ownAccountId: null,
      otherParticipants: [
        {
          name: asset.account.name,
          accountId: asset.account.id,
          share: amount,
          paid: amount,
        },
      ],
      note: dbTransaction.description,
      categoryId,
      tagsIds: dbTransaction.tags.map(t => t.id),
      tripId: dbTransaction.tripId,
    };
  }
  return {
    kind: 'EXPENSE',
    transactionId: dbTransaction.id,
    timestampEpoch: new Date(dbTransaction.timestamp).getTime(),
    vendor,
    ownPaid: amount,
    ownShare: amount,
    ownAccountId: asset.account.id,
    otherParticipants: [],
    note: dbTransaction.description,
    categoryId,
    tagsIds: dbTransaction.tags.map(t => t.id),
    tripId: dbTransaction.tripId,
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
  const amount = abs({cents: income.delta});
  return {
    kind: 'INCOME',
    transactionId: dbTransaction.id,
    timestampEpoch: new Date(dbTransaction.timestamp).getTime(),
    unitId: accountUnitId(asset.account),
    payer,
    sentByPayer: amount,
    ownTransactionAmount: amount,
    actuallyReceivedOnOwnAccount: amount,
    participantShares: NOT_SHARED,
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
