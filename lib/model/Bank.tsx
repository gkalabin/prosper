import BankAccount from "./BankAccount";

type Bank = {
  id: number;
  name: string;
  displayOrder: number;
  accounts: BankAccount[];
};

export default Bank;
