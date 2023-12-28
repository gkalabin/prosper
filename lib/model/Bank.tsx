import BankAccount from "./BankAccount";

type Bank = {
  id: string;
  name: string;
  displayOrder: number;
  accounts: BankAccount[];
};


export default Bank;
