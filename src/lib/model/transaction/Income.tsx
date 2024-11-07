import {assert, assertDefined} from '@/lib/assert';
import {TransactionWithTagIds} from '@/lib/model/AllDatabaseDataModel';
import {TransactionCompanion} from '@/lib/model/transaction/TransactionCompanion';
import {TransactionType} from '@prisma/client';

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
};

export function incomeModelFromDB(init: TransactionWithTagIds): Income {
  assert(init.transactionType == TransactionType.INCOME);
  assertDefined(init.payer);
  assertDefined(init.incomingAccountId);
  assertDefined(init.incomingAmountCents);
  assertDefined(init.ownShareAmountCents);
  const companions: TransactionCompanion[] = [];
  if (init.ownShareAmountCents != init.incomingAmountCents) {
    assertDefined(
      init.otherPartyName,
      `otherPartyName is not defined for transaction id ${init.id}`
    );
    companions.push({
      name: init.otherPartyName,
      amountCents: init.incomingAmountCents - init.ownShareAmountCents,
    });
  }
  return {
    kind: 'Income',
    id: init.id,
    timestampEpoch: new Date(init.timestamp).getTime(),
    payer: init.payer,
    amountCents: init.incomingAmountCents,
    companions,
    note: init.description,
    accountId: init.incomingAccountId,
    categoryId: init.categoryId,
    tagsIds: init.tags.map(t => t.id),
    tripId: init.tripId,
  };
}
