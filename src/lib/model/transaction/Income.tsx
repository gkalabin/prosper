import {TransactionType} from '@prisma/client';
import {assert, assertDefined} from '@/lib/assert';
import {TransactionWithTagIds} from '@/lib/model/AllDatabaseDataModel';
import {TransactionCompanion} from '@/lib/model/transaction/TransactionCompanion';

export type Income = {
  kind: 'Income';
  id: number;
  timestampEpoch: number;
  payer: string;
  amountCents: number;
  companions: TransactionCompanion[];
  note: string;
  accountId: number;
  categoryId: number;
  tagsIds: number[];
  tripId: number | null;
  refundGroupTransactionIds: number[];
};

export function incomeModelFromDB(init: TransactionWithTagIds): Income {
  assert(init.transactionType == TransactionType.INCOME);
  const companions: TransactionCompanion[] = [];
  if (init.ownShareAmountCents != init.incomingAmountCents) {
    assertDefined(init.incomingAmountCents);
    assertDefined(init.ownShareAmountCents);
    assertDefined(
      init.otherPartyName,
      `otherPartyName is not defined for transaction id ${init.id}`
    );
    companions.push({
      name: init.otherPartyName,
      amountCents: init.incomingAmountCents - init.ownShareAmountCents,
    });
  }
  const refundGroupTransactionIds: number[] = [];
  if (init.transactionToBeRepayedId) {
    refundGroupTransactionIds.push(init.transactionToBeRepayedId);
  }
  assertDefined(init.payer);
  assertDefined(init.incomingAccountId);
  return {
    kind: 'Income',
    id: init.id,
    timestampEpoch: new Date(init.timestamp).getTime(),
    payer: init.payer,
    amountCents: init.amountCents,
    companions,
    note: init.description,
    accountId: init.incomingAccountId,
    categoryId: init.categoryId,
    tagsIds: init.tags.map(t => t.id),
    refundGroupTransactionIds,
    tripId: init.tripId,
  };
}
