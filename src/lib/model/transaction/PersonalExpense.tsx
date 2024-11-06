import {assert, assertDefined} from '@/lib/assert';
import {TransactionWithTagIds} from '@/lib/model/AllDatabaseDataModel';
import {TransactionCompanion} from '@/lib/model/transaction/TransactionCompanion';
import {TransactionType} from '@prisma/client';

export type PersonalExpense = {
  kind: 'PersonalExpense';
  id: number;
  timestampEpoch: number;
  vendor: string;
  amountCents: number;
  companions: TransactionCompanion[];
  note: string;
  accountId: number;
  categoryId: number;
  tagsIds: number[];
  tripId: number | null;
  refundGroupTransactionIds: number[];
};

export function personalExpenseModelFromDB(
  init: TransactionWithTagIds
): PersonalExpense {
  assert(init.transactionType == TransactionType.PERSONAL_EXPENSE);
  assertDefined(
    init.outgoingAmountCents,
    `outgoingAmountCents is not defined for transaction ${init.id}`
  );
  assertDefined(
    init.ownShareAmountCents,
    `ownShareAmountCents is not defined for transaction id ${init.id}`
  );
  assertDefined(
    init.vendor,
    `vendor is not defined for transaction id ${init.id}`
  );
  assertDefined(
    init.outgoingAccountId,
    `outgoingAccountId is not defined for transaction id ${init.id}`
  );
  const companions = [];
  if (init.ownShareAmountCents != init.outgoingAmountCents) {
    assertDefined(
      init.otherPartyName,
      `otherPartyName is not defined for transaction id ${init.id}`
    );
    companions.push({
      name: init.otherPartyName,
      amountCents: init.outgoingAmountCents - init.ownShareAmountCents,
    });
  }
  // TODO: fill for expenses.
  const refundGroupTransactionIds: number[] = [];
  return {
    kind: 'PersonalExpense',
    id: init.id,
    timestampEpoch: new Date(init.timestamp).getTime(),
    vendor: init.vendor,
    amountCents: init.outgoingAmountCents,
    companions,
    note: init.description,
    accountId: init.outgoingAccountId,
    categoryId: init.categoryId,
    tagsIds: init.tags.map(t => t.id),
    tripId: init.tripId,
    refundGroupTransactionIds: refundGroupTransactionIds,
  };
}
