import {Transaction} from '@/lib/model/transaction/Transaction';
import {
  TransactionLink as DBTransactionLink,
  TransactionLinkType as DBTransactionLinkType,
} from '@prisma/client';

export enum TransactionLinkType {
  REFUND,
  DEBT_SETTLING,
}

export type TransactionLink = {
  source: Transaction;
  linked: Transaction;
  linkType: TransactionLinkType;
};

export function transactionLinkModelFromDB(
  init: DBTransactionLink,
  allTransactions: Transaction[]
): TransactionLink {
  const source = allTransactions.find(t => t.id == init.sourceTransactionId);
  if (!source) {
    throw new Error(
      `Cannot find source transaction with id ${init.sourceTransactionId}`
    );
  }
  const linked = allTransactions.find(t => t.id == init.linkedTransactionId);
  if (!linked) {
    throw new Error(
      `Cannot find linked transaction with id ${init.linkedTransactionId}`
    );
  }
  return {
    source,
    linked,
    linkType: linkTypeFromDB(init.linkType),
  };
}

function linkTypeFromDB(
  dbLinkType: DBTransactionLinkType
): TransactionLinkType {
  switch (dbLinkType) {
    case DBTransactionLinkType.REFUND:
      return TransactionLinkType.REFUND;
    case DBTransactionLinkType.DEBT_SETTLING:
      return TransactionLinkType.DEBT_SETTLING;
    default:
      const _exhaustiveCheck: never = dbLinkType;
      throw new Error(`Unknown link type: ${_exhaustiveCheck}`);
  }
}
