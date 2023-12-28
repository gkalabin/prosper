import BankAccount from "./BankAccount";

type Transfer = {
  receivedAmountCents: number;
  accountFrom: BankAccount;
  accountTo: BankAccount;
};


export default Transfer;
