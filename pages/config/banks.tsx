import {
  Bank as DBBank,
  BankAccount as DBBankAccount,
  Currency as DBCurrency,
} from "@prisma/client";
import AddBankAccountForm from "components/config/banks/AddBankAccountForm";
import AddBankForm from "components/config/banks/AddBankForm";
import BankAccountListItem from "components/config/banks/BankAccountListItem";
import BankName from "components/config/banks/BankName";
import Layout from "components/Layout";
import { AnchorPagePrimary } from "components/ui/buttons";
import {
  banksModelFromDatabaseData,
  currencyModelFromDatabaseData,
} from "lib/ClientSideModel";
import { Bank, BankAccount } from "lib/model/BankAccount";
import { Currency } from "lib/model/Currency";
import prisma from "lib/prisma";
import { GetStaticProps, InferGetStaticPropsType } from "next";
import React, { useState } from "react";

type BanksListProps = {
  banks: Bank[];
  currencies: Currency[];
  onBankUpdated: (updated: DBBank) => void;
  onBankAccountAdded: (added: DBBankAccount) => void;
  onBankAccountUpdated: (updated: DBBankAccount) => void;
};
const BanksList: React.FC<BanksListProps> = (props) => {
  if (!props.banks) {
    return <div>No banks found.</div>;
  }
  return (
    <div className="flex-1 rounded border border-gray-200">
      <div className="flex flex-col divide-y divide-gray-200">
        {props.banks.map((bank) => (
          <div key={bank.id}>
            <BankName bank={bank} onUpdated={props.onBankUpdated} />
            <div className="space-y-1 px-4">
              <AccountsList
                bank={bank}
                accounts={bank.accounts}
                currencies={props.currencies}
                onBankAccountUpdated={props.onBankAccountUpdated}
              />
              <AddBankAccountForm
                bank={bank}
                currencies={props.currencies}
                displayOrder={bank.accounts.length * 100}
                onAdded={props.onBankAccountAdded}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

type AccountsListProps = {
  bank: Bank;
  accounts: BankAccount[];
  currencies: Currency[];
  onBankAccountUpdated: (updated: DBBankAccount) => void;
};
const AccountsList: React.FC<AccountsListProps> = (props) => {
  if (!props.accounts) {
    return <div>No accounts found.</div>;
  }
  return (
    <>
      {props.accounts.map((account) => (
        <BankAccountListItem
          key={account.id}
          bank={props.bank}
          account={account}
          currencies={props.currencies}
          onUpdated={props.onBankAccountUpdated}
        />
      ))}
    </>
  );
};

export const getStaticProps: GetStaticProps<{
  dbBanks: DBBank[];
  dbBankAccounts: DBBankAccount[];
  dbCurrencies: DBCurrency[];
}> = async () => {
  const banks = await prisma.bank.findMany();
  const bankAccounts = await prisma.bankAccount.findMany();
  const currencies = await prisma.currency.findMany();

  return {
    props: {
      dbBanks: JSON.parse(JSON.stringify(banks)),
      dbBankAccounts: JSON.parse(JSON.stringify(bankAccounts)),
      dbCurrencies: JSON.parse(JSON.stringify(currencies)),
    },
  };
};

export default function BanksPage({
  dbBanks: dbBanksInitial,
  dbBankAccounts: dbBankAccountsInitial,
  dbCurrencies,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const [dbBanks, setDbBanks] = useState(dbBanksInitial);
  const [dbBankAccounts, setDbBankAccounts] = useState(dbBankAccountsInitial);
  const addBank = (added: DBBank) => {
    setDbBanks((old: DBBank[]) => [...old, added]);
  };
  const updateBank = (updated: DBBank) => {
    setDbBanks((old: DBBank[]) =>
      old.map((b) => (b.id == updated.id ? updated : b))
    );
  };
  const addBankAccount = (added: DBBankAccount) => {
    setDbBankAccounts((old: DBBankAccount[]) => [...old, added]);
  };
  const updateBankAccount = (updated: DBBankAccount) => {
    setDbBankAccounts((old: DBBankAccount[]) =>
      old.map((b) => (b.id == updated.id ? updated : b))
    );
  };

  const [banks] = banksModelFromDatabaseData(
    dbBanks,
    dbBankAccounts,
    dbCurrencies
  );
  const currencies = currencyModelFromDatabaseData(dbCurrencies);

  return (
    <Layout>
      <div className="flex justify-end">
        <AnchorPagePrimary
          className="mb-4"
          href="/api/open-banking/connect"
          label="Connect with open banking (uk)"
        />
      </div>

      <BanksList
        banks={banks}
        currencies={currencies}
        onBankUpdated={updateBank}
        onBankAccountAdded={addBankAccount}
        onBankAccountUpdated={updateBankAccount}
      />

      <AddBankForm displayOrder={banks.length * 100} onAdded={addBank} />
    </Layout>
  );
}
