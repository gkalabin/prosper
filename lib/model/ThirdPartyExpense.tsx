import Currency from "./Currency";

type ThirdPartyExpense = {
  vendor: string;
  ownShareAmountCents: number;
  currency: Currency;
  payer: string;
  // TODO: trip
};


export default ThirdPartyExpense;
