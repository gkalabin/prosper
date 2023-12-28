import {
  Bank as DBBank,
  BankAccount as DBBankAccount,
  Currency as DBCurrency,
  OpenBankingToken as DBOpenBankingToken,
} from "@prisma/client";
import { AddOrEditBankForm } from "components/config/banks/AddBankForm";
import { AddOrEditBankAccountForm } from "components/config/banks/AddOrEditBankAccountForm";
import { ConfigPageLayout } from "components/ConfigPageLayout";
import {
  AnchorLink,
  ButtonLink,
  ButtonPagePrimary,
} from "components/ui/buttons";
import { banksModelFromDatabaseData } from "lib/ClientSideModel";
import { DB } from "lib/db";
import { Bank, BankAccount } from "lib/model/BankAccount";
import { Currencies } from "lib/model/Currency";
import { updateState } from "lib/stateHelpers";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "pages/api/auth/[...nextauth]";
import { useState } from "react";

const BanksList = (props: {
  banks: Bank[];
  currencies: Currencies;
  openBankingTokens: DBOpenBankingToken[];
  onBankUpdated: (updated: DBBank) => void;
  onBankAccountAddedOrUpdated: (x: DBBankAccount) => void;
}) => {
  if (!props.banks) {
    return <div>No banks found.</div>;
  }
  return (
    <div>
      {props.banks.map((bank) => (
        <BanksListItem
          key={bank.id}
          bank={bank}
          openBankingToken={props.openBankingTokens.find(
            (t) => t.bankId == bank.id
          )}
          currencies={props.currencies}
          onBankUpdated={props.onBankUpdated}
          onBankAccountAddedOrUpdated={props.onBankAccountAddedOrUpdated}
        />
      ))}
    </div>
  );
};

function BanksListItem({
  bank,
  openBankingToken,
  onBankUpdated,
  onBankAccountAddedOrUpdated,
  currencies,
}) {
  const [newAccountFormDisplayed, setNewAccountFormDisplayed] = useState(false);
  const [editBankFormDisplayed, setEditBankFormDisplayed] = useState(false);
  return (
    <div>
      <div className="border-b bg-indigo-200 p-2 text-gray-900">
        <div className="flex items-center gap-3">
          <h1 className="grow text-xl font-medium">{bank.name}</h1>
          <ButtonLink onClick={() => setEditBankFormDisplayed(true)}>
            Edit
          </ButtonLink>
          {openBankingToken && (
            <AnchorLink
              href={`/config/open-banking/connection/${bank.id}`}
              label="OpenBanking"
            />
          )}
          <AnchorLink
            href={`/api/open-banking/connect?bankId=${bank.id}`}
            label={openBankingToken ? "Reconnect" : "Connect"}
          />
        </div>

        {editBankFormDisplayed && (
          <AddOrEditBankForm
            bank={bank}
            onAddedOrUpdated={(x) => {
              onBankUpdated(x);
              setEditBankFormDisplayed(false);
            }}
            onCancelClick={() => setEditBankFormDisplayed(false)}
            displayOrder={0}
          />
        )}
      </div>

      <div className="space-y-1 px-4">
        <AccountsList
          bank={bank}
          accounts={bank.accounts}
          currencies={currencies}
          onBankAccountAddedOrUpdated={onBankAccountAddedOrUpdated}
        />
        {!newAccountFormDisplayed && (
          <ButtonLink onClick={() => setNewAccountFormDisplayed(true)}>
            Add New Account
          </ButtonLink>
        )}
        {newAccountFormDisplayed && (
          <AddOrEditBankAccountForm
            bank={bank}
            currencies={currencies}
            onAddedOrUpdated={(x) => {
              setNewAccountFormDisplayed(false);
              onBankAccountAddedOrUpdated(x);
            }}
            onClose={() => setNewAccountFormDisplayed(false)}
          />
        )}
      </div>
    </div>
  );
}

const AccountsList = (props: {
  bank: Bank;
  accounts: BankAccount[];
  currencies: Currencies;
  onBankAccountAddedOrUpdated: (updated: DBBankAccount) => void;
}) => {
  if (!props.accounts) {
    return <div>No accounts.</div>;
  }
  return (
    <>
      {props.accounts.map((account) => (
        <AccountListItem
          key={account.id}
          bank={props.bank}
          account={account}
          currencies={props.currencies}
          onUpdated={props.onBankAccountAddedOrUpdated}
        />
      ))}
    </>
  );
};

const AccountListItem = (props: {
  bank: Bank;
  account: BankAccount;
  currencies: Currencies;
  onUpdated: (updated: DBBankAccount) => void;
}) => {
  const [formDisplayed, setFormDisplayed] = useState(false);
  return (
    <>
      <div>
        <span className="text-lg">{props.account.name}</span>
        {!formDisplayed && (
          <ButtonLink className="ml-2" onClick={() => setFormDisplayed(true)}>
            Edit
          </ButtonLink>
        )}
      </div>
      {formDisplayed && (
        <div className="ml-2">
          <AddOrEditBankAccountForm
            bank={props.bank}
            bankAccount={props.account}
            currencies={props.currencies}
            onAddedOrUpdated={(x) => {
              setFormDisplayed(false);
              props.onUpdated(x);
            }}
            onClose={() => setFormDisplayed(false)}
          />
        </div>
      )}
    </>
  );
};

export const getServerSideProps: GetServerSideProps<{
  data?: {
    dbBanks: DBBank[];
    dbBankAccounts: DBBankAccount[];
    dbCurrencies: DBCurrency[];
    dbOpenBankingTokens: DBOpenBankingToken[];
  };
}> = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    return { props: {} };
  }
  const db = await DB.fromContext(context);
  const dbBanks = await db.bankFindMany();
  const dbBankAccounts = await db.bankAccountFindMany({
    where: {
      bankId: {
        in: dbBanks.map((x) => x.id),
      },
    },
  });
  const dbCurrencies = await db.currencyFindMany();
  const dbOpenBankingTokens = await db.openBankingTokenFindMany({
    where: {
      bankId: {
        in: dbBanks.map((x) => x.id),
      },
    },
  });

  const props = {
    session,
    data: {
      dbBanks,
      dbBankAccounts,
      dbCurrencies,
      dbOpenBankingTokens,
    },
  };
  return {
    props: JSON.parse(JSON.stringify(props)),
  };
};

export default function BanksPage({
  data: {
    dbBanks: dbBanksInitial,
    dbBankAccounts: dbBankAccountsInitial,
    dbCurrencies,
    dbOpenBankingTokens,
  },
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [dbBanks, setDbBanks] = useState(dbBanksInitial);
  const [dbBankAccounts, setDbBankAccounts] = useState(dbBankAccountsInitial);
  const [formDisplayed, setFormDisplayed] = useState(false);

  const currencies = new Currencies(dbCurrencies);
  const [banks] = banksModelFromDatabaseData(
    dbBanks,
    dbBankAccounts,
    currencies
  );

  return (
    <ConfigPageLayout>
      <BanksList
        banks={banks}
        openBankingTokens={dbOpenBankingTokens}
        currencies={currencies}
        onBankUpdated={updateState(setDbBanks)}
        onBankAccountAddedOrUpdated={updateState(setDbBankAccounts)}
      />

      {!formDisplayed && (
        <div className="flex justify-end">
          <ButtonPagePrimary onClick={() => setFormDisplayed(true)}>
            Add New Bank
          </ButtonPagePrimary>
        </div>
      )}
      {formDisplayed && (
        <div className="mt-4 rounded-md border p-2">
          <AddOrEditBankForm
            displayOrder={banks.length * 100}
            onAddedOrUpdated={updateState(setDbBanks)}
            onCancelClick={() => setFormDisplayed(false)}
          />
        </div>
      )}
    </ConfigPageLayout>
  );
}
