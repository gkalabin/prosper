import { TransactionType } from "@prisma/client";
import { assert } from "lib/assert";
import { TransactionWithTagIds } from "lib/model/AllDatabaseDataModel";
import { TransactionCompanion } from "lib/model/transaction/TransactionCompanion";

export type ThirdPartyExpense = {
  kind: "ThirdPartyExpense";
  id: number;
  timestampEpoch: number;
  payer: string;
  vendor: string;
  amountCents: number;
  currencyCode: string;
  ownShareCents: number;
  companions: TransactionCompanion[];
  note: string;
  categoryId: number;
  tagsIds: number[];
  tripId?: number;
};

export function thirdPartyExpenseModelFromDB(
  init: TransactionWithTagIds,
): ThirdPartyExpense {
  assert(init.transactionType == TransactionType.THIRD_PARTY_EXPENSE);
  const companions = [
    {
      name: init.payer,
      amountCents: init.payerOutgoingAmountCents - init.ownShareAmountCents,
    },
  ];
  return {
    kind: "ThirdPartyExpense",
    id: init.id,
    timestampEpoch: new Date(init.timestamp).getTime(),
    payer: init.payer,
    vendor: init.vendor,
    amountCents: init.payerOutgoingAmountCents,
    currencyCode: init.currencyCode,
    ownShareCents: init.ownShareAmountCents,
    companions,
    note: init.description,
    categoryId: init.categoryId,
    tagsIds: init.tags.map((t) => t.id),
    tripId: init.tripId,
  };
}
