import { TransactionType } from "@prisma/client";
import { assert } from "lib/assert";
import { TransactionWithTagIds } from "lib/model/AllDatabaseDataModel";
import { TransactionCompanion } from "lib/model/transaction/TransactionCompanion";

export type PersonalExpense = {
  kind: "PersonalExpense";
  id: number;
  timestampEpoch: number;
  vendor: string;
  amountCents: number;
  companions: TransactionCompanion[];
  note: string;
  accountId: number;
  categoryId: number;
  tagsIds: number[];
  tripId?: number;
  refundGroupTransactionIds: number[];
};

export function personalExpenseModelFromDB(
  init: TransactionWithTagIds,
): PersonalExpense {
  assert(init.transactionType == TransactionType.PERSONAL_EXPENSE);
  const companions = [];
  if (init.ownShareAmountCents != init.outgoingAmountCents) {
    companions.push({
      name: init.otherPartyName,
      amountCents: init.amountCents - init.ownShareAmountCents,
    });
  }
  // TODO: fill for expenses.
  const refundGroupTransactionIds: number[] = [];
  return {
    kind: "PersonalExpense",
    id: init.id,
    timestampEpoch: new Date(init.timestamp).getTime(),
    vendor: init.vendor,
    amountCents: init.amountCents,
    companions,
    note: init.description,
    accountId: init.outgoingAccountId,
    categoryId: init.categoryId,
    tagsIds: init.tags.map((t) => t.id),
    tripId: init.tripId,
    refundGroupTransactionIds: refundGroupTransactionIds,
  };
}
