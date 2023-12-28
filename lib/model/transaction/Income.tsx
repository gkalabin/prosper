import { assertDefined } from "lib/assert";
import { TransactionWithExtensionsAndTagIds } from "lib/model/AllDatabaseDataModel";
import { TransactionCompanion } from "lib/model/transaction/TransactionCompanion";

export type Income = {
  kind: "Income";
  id: number;
  timestampEpoch: number;
  payer: string;
  amountCents: number;
  companions: TransactionCompanion[];
  note: string;
  accountId: number;
  categoryId: number;
  tagsIds: number[];
  tripId?: number;
  refundGroupTransactionIds: number[];
};

export function incomeModelFromDB(
  init: TransactionWithExtensionsAndTagIds,
): Income {
  assertDefined(init.income);
  const companions = [];
  if (init.income.ownShareAmountCents != init.amountCents) {
    companions.push({
      name: init.income.otherPartyName,
      amountCents: init.amountCents - init.income.ownShareAmountCents,
    });
  }
  const refundGroupTransactionIds: number[] = [];
  if (init.transactionToBeRepayedId) {
    refundGroupTransactionIds.push(init.transactionToBeRepayedId);
  }
  return {
    kind: "Income",
    id: init.id,
    timestampEpoch: new Date(init.timestamp).getTime(),
    payer: init.income.payer,
    amountCents: init.amountCents,
    companions,
    note: init.description,
    accountId: init.income.accountId,
    categoryId: init.categoryId,
    tagsIds: init.tags.map((t) => t.id),
    refundGroupTransactionIds,
  };
}
