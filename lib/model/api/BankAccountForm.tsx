export type CurrencyApiModel = { kind: "currency"; currencyCode: string };

export type StockApiModel = {
  kind: "stock";
  ticker: string;
  exchange: string;
  name: string;
};

export type UnitApiModel = CurrencyApiModel | StockApiModel;

export type BankAccountApiModel = {
  name: string;
  unit: UnitApiModel;
  isJoint: boolean;
  isArchived: boolean;
  initialBalance: number;
  displayOrder: number;
};

export type CreateBankAccountRequest = BankAccountApiModel & {
  bankId: number;
};
