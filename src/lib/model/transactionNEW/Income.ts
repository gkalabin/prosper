import {
  AccountOwnership,
  AccountType,
  accountUnitId,
} from '@/lib/model/Account';
import {TransactionNEWWithTagIds} from '@/lib/model/AllDatabaseDataModel';
import {abs} from '@/lib/model/Amount';
import {AccountBalanceUpdate} from '@/lib/model/transactionNEW/AccountBalanceUpdate';
import {counterpartyAndCategoryFromLines} from '@/lib/model/transactionNEW/LinesParsing';
import {modelError} from '@/lib/model/transactionNEW/ModelParsingError';
import {TransactionLineNEW as DBTransactionLine} from '@prisma/client';
import {Categorisation} from './Categorisation';

export type Income = {
  kind: 'INCOME';
  transactionId: number;
  timestampEpoch: number;
  note: string;
  payer: string; // Source of the income, e.g. "Employer"
  categorisation: Categorisation;
  balanceUpdates: AccountBalanceUpdate[];
  tagsIds: number[];
  tripId: number | null;
};

export function newIncome({
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
  const incomeLines = lines.filter(l => l.accountId === income.account.id);
  if (incomeLines.length === 0) {
    return modelError(dbTransaction, lines, updates, 'Income lines not found');
  }
  const {counterparty: payer, categoryId} = counterpartyAndCategoryFromLines({
    dbTransaction,
    unsortedLines: incomeLines,
    allLines: lines,
    updates,
  });
  const amount = abs(income.delta);
  return {
    kind: 'INCOME',
    transactionId: dbTransaction.id,
    timestampEpoch: new Date(dbTransaction.timestamp).getTime(),
    payer,
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

export function newSharedIncome({
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
  const updates = [debit, ...credits];
  if (debit.account.ownership == AccountOwnership.OWNED_BY_OTHER) {
    return modelError(
      dbTransaction,
      lines,
      updates,
      'Income receipt should be to an owned account'
    );
  }
  const ownIncome = credits.find(x => x.account.type == AccountType.INCOME);
  const thirdPartyIncome = credits.find(
    x => x.account.ownership == AccountOwnership.OWNED_BY_OTHER
  );
  if (!ownIncome || !thirdPartyIncome) {
    return modelError(dbTransaction, lines, updates);
  }
  const incomeLines = lines.filter(l => l.accountId === ownIncome.account.id);
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
    categorisation: {
      categoryId,
      unitId: accountUnitId(debit.account),
      userShare: abs(ownIncome.delta),
      companion: {
        accountId: thirdPartyIncome.account.id,
        share: abs(thirdPartyIncome.delta),
      },
    },
    balanceUpdates: updates,
    note: dbTransaction.description,
    tagsIds: dbTransaction.tags.map(t => t.id),
    tripId: dbTransaction.tripId,
  };
}
