import {Income} from '@/lib/model/transaction/Income';
import {PersonalExpense} from '@/lib/model/transaction/PersonalExpense';
import {ThirdPartyExpense} from '@/lib/model/transaction/ThirdPartyExpense';
import {
  Expense,
  isExpense,
  isIncome,
  isPersonalExpense,
  isThirdPartyExpense,
  Transaction,
} from '@/lib/model/transaction/Transaction';
import {
  Transaction as DBTransaction,
  TransactionLink as DBTransactionLink,
} from '@prisma/client';

export enum TransactionLinkType {
  REFUND,
  DEBT_SETTLING,
}

export type DebtSettling = {
  kind: 'DEBT_SETTLING';
  id: number;
  expense: ThirdPartyExpense;
  repayment: PersonalExpense;
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
  allTransactions: Transaction[],
  // TODO: instead of passing db model here, make client Transaction mode aware of versions.
  // This is to solve a problem with links between superseded transactions:
  // we pass all links here, including between superseded transactions, but these are not found
  // in the list of converted transactions to the client side model.
  dbTransactions: DBTransaction[]
): TransactionLink[] {
  const supersededIds = new Set(
    dbTransactions.map(t => t.supersedesId).filter(id => id !== null)
  );
  const transactionById = new Map(allTransactions.map(t => [t.id, t]));
  const refunds = new Map<number, Refund>();
  const debts = new Map<number, DebtSettling>();
  for (const l of dbLinks) {
    // Skip links where either side has been superseded by a newer version.
    // For example, P1 is payment and R1 is linked refund. User edits R1
    // which becomes R2. The link stays between R1 and P1, but R1 is
    // superseded and there is no link between R2 and P1.
    if (
      supersededIds.has(l.sourceTransactionId) ||
      supersededIds.has(l.linkedTransactionId)
    ) {
      continue;
    }
    const {source, linked} = findSourceAndLinked(l, transactionById);
    switch (l.linkType) {
      case 'REFUND': {
        let refund = refunds.get(source.id);
        if (!refund) {
          if (!isExpense(source)) {
            throw new Error(
              `Refund ${l.id} source ${source.id} is not an expense, but ${source.kind}`
            );
          }
          refund = {kind: 'REFUND', id: l.id, expense: source, refunds: []};
          refunds.set(source.id, refund);
        }
        if (!isIncome(linked)) {
          throw new Error(
            `Refund ${l.id} linked transaction ${linked.id} is not an income`
          );
        }
        refund.refunds.push(linked);
        break;
      }
      case 'DEBT_SETTLING': {
        if (!isThirdPartyExpense(source)) {
          throw new Error(
            `Debt settling ${l.id} source ${source.id} is not a third party expense`
          );
        }
        if (!isPersonalExpense(linked)) {
          throw new Error(
            `Debt settling ${l.id} linked transaction ${linked.id} is not a personal expense`
          );
        }
        debts.set(source.id, {
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
  transactionById: Map<number, Transaction>
): {source: Transaction; linked: Transaction} {
  const source = transactionById.get(dbLink.sourceTransactionId);
  if (!source) {
    throw new Error(`Source transaction not found for link ${dbLink.id}`);
  }
  const linked = transactionById.get(dbLink.linkedTransactionId);
  if (!linked) {
    throw new Error(`Linked transaction not found for link ${dbLink.id}`);
  }
  return {source, linked};
}
