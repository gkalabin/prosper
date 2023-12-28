import Currency from "./Currency";

export type Bank = {
  id: number;
  name: string;
  displayOrder: number;
  accounts: BankAccount[];
};

export type BankAccount = {
  id: number;
  name: string;
  currency: Currency;
  displayOrder: number;
  bank: Bank;
};
