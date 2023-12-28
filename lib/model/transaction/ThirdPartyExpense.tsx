import { assertDefined } from "lib/assert";
import { TransactionWithExtensionsAndTagIds } from "lib/model/AllDatabaseDataModel";
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
  init: TransactionWithExtensionsAndTagIds,
): ThirdPartyExpense {
  assertDefined(init.thirdPartyExpense);
  const companions = [
    {
      name: init.thirdPartyExpense.payer,
      amountCents:
        init.amountCents - init.thirdPartyExpense.ownShareAmountCents,
    },
  ];
  return {
    kind: "ThirdPartyExpense",
    id: init.id,
    timestampEpoch: new Date(init.timestamp).getTime(),
    payer: init.thirdPartyExpense.payer,
    vendor: init.thirdPartyExpense.vendor,
    amountCents: init.amountCents,
    currencyCode: init.thirdPartyExpense.currencyCode,
    ownShareCents: init.thirdPartyExpense.ownShareAmountCents,
    companions,
    note: init.description,
    categoryId: init.categoryId,
    tagsIds: init.tags.map((t) => t.id),
    tripId: init.thirdPartyExpense.tripId,
  };
}
