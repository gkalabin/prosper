import { ThirdPartyExpense as DBThirdPartyExpense } from "@prisma/client";
import { Currency } from "./Currency";

export type ThirdPartyExpense = {
  vendor: string;
  ownShareAmountCents: number;
  currency: Currency;
  payer: string;
  dbValue: DBThirdPartyExpense;
  // TODO: trip
};

export const thirdPartyExpenseModelFromDB = (
  dbEntries: DBThirdPartyExpense[],
  currencies: Currency[]
): ThirdPartyExpense[] => {
  const currencyById = Object.fromEntries(currencies.map((x) => [x.id, x]));
  return dbEntries.map((x) =>
    Object.assign({}, x, {
      currency: currencyById[x.currencyId],
      dbValue: x,
    })
  );
};
