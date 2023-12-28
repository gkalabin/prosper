import React from "react";
import prisma from "../lib/prisma";
import { GetStaticProps } from "next";
import Layout from "../components/Layout";
import Transaction from "../lib/model/Transaction";
import Bank from "../lib/model/Bank";
import Currency from "../lib/model/Currency";
import { DbCategory, makeCategoryTree } from "../lib/model/Category";
import { AddTransactionForm } from "../components/transactions/AddTransactionForm";
import { makeTransactionInclude } from "../lib/db/transactionInclude";
import BankAccount from "../lib/model/BankAccount";

export const getStaticProps: GetStaticProps = async () => {
  const transactions = await prisma.transaction.findMany({
    include: makeTransactionInclude(),
  });
  const categories = await prisma.category.findMany({});
  const currencies = await prisma.currency.findMany({});
  const banks = await prisma.bank.findMany({
    include: {
      accounts: true,
    },
  });
  const props = {
    transactions,
    banks,
    currencies,
    dbCategories: categories,
  };

  return {
    props: JSON.parse(JSON.stringify(props)),
  };
};

type BankAccountListItemProps = {
  account: BankAccount;
};
const BankAccountListItem: React.FC<BankAccountListItemProps> = (props) => {
  return (
    <div>
      <h6>{props.account.name}</h6>
    </div>
  );
};

type BankListItemProps = {
  bank: Bank;
};
const BankListItem: React.FC<BankListItemProps> = (props) => {
  return (
    <div>
      <h4>{props.bank.name}</h4>
      {props.bank.accounts.map((a) => (
        <BankAccountListItem key={a.id} account={a} />
      ))}
    </div>
  );
};

type TransactionsListProps = {
  banks: Bank[];
};
const BanksList: React.FC<TransactionsListProps> = (props) => {
  if (!props.banks?.length) {
    return <div>No banks.</div>;
  }
  return (
    <>
      {props.banks.map((b) => (
        <BankListItem key={b.id} bank={b} />
      ))}
    </>
  );
};

type PageProps = {
  transactions: Transaction[];
  dbCategories: DbCategory[];
  banks: Bank[];
  currencies: Currency[];
};
const OverviewPage: React.FC<PageProps> = (props) => {
  const addTransaction = (added: Transaction) => {
    // TODO
    console.log(added);
  };

  return (
    <Layout>
      <AddTransactionForm
        onAdded={addTransaction}
        categories={makeCategoryTree(props.dbCategories)}
        banks={props.banks}
        currencies={props.currencies}
      />
      <BanksList banks={props.banks} />
    </Layout>
  );
};

export default OverviewPage;
