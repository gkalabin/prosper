import { Bank as DBBank, BankAccount as DBBankAccount } from "@prisma/client";
import { Currency } from "./Currency";

export type Bank = {
  id: number;
  name: string;
  displayOrder: number;
  accounts: BankAccount[];
  dbValue: DBBank;
};

export type BankAccount = {
  id: number;
  name: string;
  currency: Currency;
  displayOrder: number;
  bank: Bank;
  dbValue: DBBankAccount;
};

export const bankAccountModelFromDB = (
  dbBanks: DBBank[],
  dbBankAccounts: DBBankAccount[],
  currencies: Currency[]
): { banks: Bank[]; bankAccounts: BankAccount[] } => {
  const banks = dbBanks.map((b) =>
    Object.assign({}, b, {
      accounts: [],
      dbValue: b,
    })
  );
  const bankById = Object.fromEntries(banks.map((x) => [x.id, x]));
  const currencyById = Object.fromEntries(currencies.map((x) => [x.id, x]));

  const bankAccounts = dbBankAccounts.map((x) =>
    Object.assign({}, x, {
      bank: bankById[x.bankId],
      currency: currencyById[x.currencyId],
      dbValue: x,
    })
  );
  bankAccounts.forEach((ba) => {
    ba.bank.accounts.push(ba);
  });

  return {
    banks,
    bankAccounts,
  };
};
