import React, { useState } from "react";
import prisma from "../../lib/prisma";
import { GetStaticProps } from "next";
import Layout from "../../components/Layout";
import AddBankForm from "../../components/config/banks/AddBankForm";
import Bank from "../../lib/model/Bank";
import BankAccount from "../../lib/model/BankAccount";
import Currency from "../../lib/model/Currency";
import BankName from "../../components/config/banks/BankName";
import AddBankAccountForm from "../../components/config/banks/AddBankAccountForm";
import BankAccountListItem from "../../components/config/banks/BankAccountListItem";

export const getStaticProps: GetStaticProps = async () => {
  const banks = await prisma.bank.findMany({
    include: {
      accounts: {
        include: { currency: true },
      },
    },
  });
  console.debug(banks);
  const currencies = await prisma.currency.findMany({});
  const props = {
    banks,
    currencies,
  };

  return {
    props: JSON.parse(JSON.stringify(props)),
  };
};

type BanksListProps = {
  banks: Bank[];
  currencies: Currency[];
  onBankUpdated: (updated: Bank) => void;
  onBankAccountAdded: (bank: Bank, added: BankAccount) => void;
  onBankAccountUpdated: (bank: Bank, updated: BankAccount) => void;
};
const BanksList: React.FC<BanksListProps> = (props) => {
  if (!props.banks) {
    return <div>No banks found.</div>;
  }
  return (
    <div className="space-y-1 px-4">
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
  );
};

type AccountsListProps = {
  bank: Bank;
  accounts: BankAccount[];
  currencies: Currency[];
  onBankAccountUpdated: (bank: Bank, updated: BankAccount) => void;
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

type PageProps = {
  banks: Bank[];
  currencies: Currency[];
};
const BanksPage: React.FC<PageProps> = (props) => {
  const [banksUnordered, setBanks] = useState(props.banks);
  const banks = []
    .concat(banksUnordered)
    .sort((b1, b2) => b1.displayOrder - b2.displayOrder);

  const addBank = (added: Bank) => {
    setBanks((old) => [...old, added]);
  };
  const updateBank = (updated: Bank) => {
    setBanks((old) => old.map((b) => (b.id == updated.id ? updated : b)));
  };

  const addBankAccount = (bank: Bank, added: BankAccount) => {
    setBanks((old) =>
      old.map((b) =>
        b.id == bank.id
          ? Object.assign({}, b, { accounts: [...b.accounts, added] })
          : b
      )
    );
  };
  const updateBankAccount = (bank: Bank, updated: BankAccount) => {
    setBanks((old) =>
      old.map((b) => {
        if (b.id != bank.id) {
          return b;
        }
        const updatedAccounts = b.accounts.map((a) =>
          a.id == updated.id ? updated : a
        );
        const updatedBank = Object.assign({}, b, { accounts: updatedAccounts });
        console.log(updatedAccounts);
        console.log(updatedBank);
        return updatedBank;
      })
    );
  };

  return (
    <Layout>
      <BanksList
        banks={banks}
        currencies={props.currencies}
        onBankUpdated={updateBank}
        onBankAccountAdded={addBankAccount}
        onBankAccountUpdated={updateBankAccount}
      />
      <AddBankForm displayOrder={banks.length * 100} onAdded={addBank} />
    </Layout>
  );
};

export default BanksPage;
