import Currency from "./Currency";

type BankAccount = {
  id: string;
  name: string;
  currency: Currency;
  displayOrder: number;
};

export default BankAccount;
