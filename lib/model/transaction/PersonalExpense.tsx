import { assertDefined } from "lib/assert";
import { TransactionWithExtensionsAndTagIds } from "lib/model/AllDatabaseDataModel";
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
  init: TransactionWithExtensionsAndTagIds,
): PersonalExpense {
  assertDefined(init.personalExpense);
  const companions = [];
  if (init.personalExpense.ownShareAmountCents != init.amountCents) {
    companions.push({
      name: init.personalExpense.otherPartyName,
      amountCents: init.amountCents - init.personalExpense.ownShareAmountCents,
    });
  }
  // TODO: fill for expenses.
  const refundGroupTransactionIds: number[] = [];
  return {
    kind: "PersonalExpense",
    id: init.id,
    timestampEpoch: new Date(init.timestamp).getTime(),
    vendor: init.personalExpense.vendor,
    amountCents: init.amountCents,
    companions,
    note: init.description,
    accountId: init.personalExpense.accountId,
    categoryId: init.categoryId,
    tagsIds: init.tags.map((t) => t.id),
    tripId: init.personalExpense.tripId,
    refundGroupTransactionIds: refundGroupTransactionIds,
  };
}
