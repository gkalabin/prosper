import {
  Expense,
  Income,
  Transaction,
} from '@/lib/model/transactionNEW/Transaction';
import {TransactionLink as DBTransactionLink} from '@prisma/client';

export enum TransactionLinkType {
  REFUND,
  DEBT_SETTLING,
}

export type DebtSettling = {
  kind: 'DEBT_SETTLING';
  id: number;
  expense: Expense;
  repayment: Expense;
};

export type Refund = {
  kind: 'REFUND';
  id: number;
  expense: Expense;
  refunds: Income[];
};

export type TransactionLink = DebtSettling | Refund;

export function transactionLinkModelFromDB(
  dbLinks: DBTransactionLink[],
  allTransactions: Transaction[]
): TransactionLink[] {
  const refunds = new Map<number, Refund>();
  const debts = new Map<number, DebtSettling>();
  for (const l of dbLinks) {
    const {source, linked} = findSourceAndLinked(l, allTransactions);
    switch (l.linkType) {
      case 'REFUND': {
        let refund = refunds.get(source.transactionId);
        if (!refund) {
          if (source.kind !== 'EXPENSE') {
            throw new Error(
              `Refund ${l.id} source ${source.transactionId} is not an expense`
            );
          }
          refund = {kind: 'REFUND', id: l.id, expense: source, refunds: []};
          refunds.set(source.transactionId, refund);
        }
        if (linked.kind !== 'INCOME') {
          throw new Error(
            `Refund ${l.id} linked transaction ${linked.transactionId} is not an income`
          );
        }
        refund.refunds.push(linked);
        break;
      }
      case 'DEBT_SETTLING': {
        // TODO: check if the expense is a third party expense.
        if (source.kind !== 'EXPENSE') {
          throw new Error(
            `Debt settling ${l.id} source ${source.transactionId} is not a third party expense`
          );
        }
        // TODO: check if the repayment is a personal expense.
        if (linked.kind !== 'EXPENSE') {
          throw new Error(
            `Debt settling ${l.id} linked transaction ${linked.transactionId} is not a personal expense`
          );
        }
        debts.set(source.transactionId, {
          kind: 'DEBT_SETTLING',
          id: l.id,
          expense: source,
          repayment: linked,
        });
        break;
      }
    }
  }
  return [...refunds.values(), ...debts.values()];
}

function findSourceAndLinked(
  dbLink: DBTransactionLink,
  allTransactions: Transaction[]
): {source: Transaction; linked: Transaction} {
  const source = allTransactions.find(
    t => t.transactionId === dbLink.sourceTransactionId
  );
  if (!source) {
    throw new Error(`Source transaction not found for link ${dbLink.id}`);
  }
  const linked = allTransactions.find(
    t => t.transactionId === dbLink.linkedTransactionId
  );
  if (!linked) {
    throw new Error(`Linked transaction not found for link ${dbLink.id}`);
  }
  return {source, linked};
}
