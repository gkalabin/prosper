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
import {TransactionLink as DBTransactionLink} from '@prisma/client';

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
  allTransactions: Transaction[]
): TransactionLink[] {
  const refunds = new Map<number, Refund>();
  const debts = new Map<number, DebtSettling>();
  for (const l of dbLinks) {
    const {source, linked} = findSourceAndLinked(l, allTransactions);
    switch (l.linkType) {
      case 'REFUND': {
        let refund = refunds.get(source.id);
        if (!refund) {
          if (!isExpense(source)) {
            throw new Error(
              `Refund ${l.id} source ${source.id} is not an expense`
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
  allTransactions: Transaction[]
): {source: Transaction; linked: Transaction} {
  const source = allTransactions.find(t => t.id === dbLink.sourceTransactionId);
  if (!source) {
    throw new Error(`Source transaction not found for link ${dbLink.id}`);
  }
  const linked = allTransactions.find(t => t.id === dbLink.linkedTransactionId);
  if (!linked) {
    throw new Error(`Linked transaction not found for link ${dbLink.id}`);
  }
  return {source, linked};
}
