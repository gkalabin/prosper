export type CurrencyFormValue = {
  kind: "currency";
  currencyCode: string;
};

export type StockFormValue = {
  kind: "stock";
  ticker: string;
  exchange: string;
  name: string;
};

export type AccountUnitFormValue = CurrencyFormValue | StockFormValue;

export type BankAccountFormValues = {
  name: string;
  unit: AccountUnitFormValue;
  isJoint: boolean;
  isArchived: boolean;
  initialBalance: number;
  displayOrder: number;
};

export type CreateBankAccountRequest = BankAccountFormValues & {
  bankId: number;
};
