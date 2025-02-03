import {TransactionNEWWithTagIds} from '@/lib/model/AllDatabaseDataModel';
import {AccountBalanceUpdate} from '@/lib/model/transactionNEW/AccountBalanceUpdate';
import {modelError} from '@/lib/model/transactionNEW/ModelParsingError';
import {TransactionLineNEW as DBTransactionLine} from '@prisma/client';

export function categoryIdFromLines({
  dbTransaction,
  unsortedLines,
  allLines,
  updates,
}: {
  dbTransaction: TransactionNEWWithTagIds;
  unsortedLines: DBTransactionLine[];
  allLines: DBTransactionLine[];
  updates: AccountBalanceUpdate[];
}): number {
  const sortedLines = sortLines(unsortedLines);
  let categoryId = null;
  for (const l of sortedLines) {
    if (l.categoryId) {
      categoryId = l.categoryId;
    }
  }
  if (!categoryId) {
    throw modelError(dbTransaction, allLines, updates, `Category not found`);
  }
  return categoryId;
}

export function counterpartyAndCategoryFromLines({
  dbTransaction,
  unsortedLines,
  allLines,
  updates,
}: {
  dbTransaction: TransactionNEWWithTagIds;
  unsortedLines: DBTransactionLine[];
  // TODO: this parameter doesn't belong here, create a struct ParsingContext and pass it around instead.
  allLines: DBTransactionLine[];
  updates: AccountBalanceUpdate[];
}): {
  counterparty: string;
  categoryId: number;
} {
  const sortedLines = sortLines(unsortedLines);
  let counterparty = null;
  let categoryId = null;
  for (const l of sortedLines) {
    if (l.counterparty) {
      counterparty = l.counterparty;
    }
    if (l.categoryId) {
      categoryId = l.categoryId;
    }
  }
  // TODO: clean up.
  if (!counterparty) {
    counterparty = 'Unknown';
  }
  if (!counterparty) {
    throw modelError(
      dbTransaction,
      allLines,
      updates,
      `Counterparty not found`
    );
  }
  if (!categoryId) {
    throw modelError(dbTransaction, allLines, updates, `Category not found`);
  }
  return {counterparty, categoryId};
}

function sortLines(unsortedLines: DBTransactionLine[]): DBTransactionLine[] {
  // TODO: the next line assumes the newer lines have higher ids, this is currently the case,
  // but it's cleaner to not have this implicit assumption.
  return unsortedLines.slice().sort((a, b) => b.id - a.id);
}
