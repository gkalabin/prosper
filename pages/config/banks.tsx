import {
  Bank as DBBank,
  BankAccount as DBBankAccount,
  Currency as DBCurrency,
  OpenBankingToken as DBOpenBankingToken,
} from "@prisma/client";
import { AddOrEditBankAccountForm } from "components/config/banks/AddOrEditBankAccountForm";
import { AddBankForm } from "components/config/banks/AddBankForm";
import { ConfigPageLayout } from "components/ConfigPageLayout";
import { Input } from "components/forms/Input";
import {
  AnchorLink,
  ButtonFormPrimary,
  ButtonFormSecondary,
  ButtonLink,
} from "components/ui/buttons";
import { banksModelFromDatabaseData } from "lib/ClientSideModel";
import { DB } from "lib/db";
import { Bank, BankAccount } from "lib/model/BankAccount";
import { Currencies } from "lib/model/Currency";
import { updateState } from "lib/stateHelpers";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "pages/api/auth/[...nextauth]";
import React, { useState } from "react";

const BankName = (props: {
  bank: Bank;
  openBankingToken?: DBOpenBankingToken;
  onUpdated: (bank: DBBank) => void;
}) => {
  const [name, setName] = useState(props.bank.name);
  const [displayOrder, setDisplayOrder] = useState(props.bank.displayOrder);
  const [formDisplayed, setFormDisplayed] = useState(false);
  const [apiError, setApiError] = useState("");
  const [requestInFlight, setRequestInFlight] = useState(false);

  const reset = () => {
    setName(props.bank.name);
    setDisplayOrder(props.bank.displayOrder);
    setApiError("");
  };

  const open = () => {
    reset();
    setFormDisplayed(true);
  };

  const close = () => {
    reset();
    setFormDisplayed(false);
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setApiError("");
    setRequestInFlight(true);
    try {
      const body = {
        name,
        displayOrder,
      };
      const response = await fetch(`/api/config/bank/${props.bank.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      props.onUpdated(await response.json());
      close();
    } catch (error) {
      setApiError(`Failed to update: ${error}`);
    }
    setRequestInFlight(false);
  };

  if (!formDisplayed) {
    return (
      <div className="border-b bg-indigo-200 p-2 text-gray-900">
        <div className="flex items-center gap-3">
          <h1 className="grow text-xl font-medium">{props.bank.name}</h1>
          <ButtonLink onClick={open}>Edit</ButtonLink>
          {props.openBankingToken && (
            <AnchorLink
              href={`/config/open-banking/connection/${props.bank.id}`}
              label="OpenBanking"
            />
          )}
          <AnchorLink
            href={`/api/open-banking/connect?bankId=${props.bank.id}`}
            label={props.openBankingToken ? "Reconnect" : "Connect"}
          />
        </div>
      </div>
    );
  }
  return (
    <form onSubmit={handleSubmit} className="flex gap-1 p-2">
      <Input
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        type="text"
        disabled={requestInFlight}
        value={name}
      />
      <Input
        onChange={(e) => setDisplayOrder(+e.target.value)}
        placeholder="Display order"
        type="number"
        disabled={requestInFlight}
        value={displayOrder}
      />
      <ButtonFormSecondary onClick={close} disabled={requestInFlight}>
        Cancel
      </ButtonFormSecondary>
      <ButtonFormPrimary disabled={!name || requestInFlight} type="submit">
        {requestInFlight ? "Updating…" : "Update"}
      </ButtonFormPrimary>

      {apiError && <span className="text-red-500">{apiError}</span>}
    </form>
  );
};

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
    <div className="flex-1 rounded border border-gray-200">
      <div className="flex flex-col divide-y divide-gray-200">
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
  const [formDisplayed, setFormDisplayed] = useState(false);
  return (
    <div>
      <BankName
        bank={bank}
        openBankingToken={openBankingToken}
        onUpdated={onBankUpdated}
      />
      <div className="space-y-1 px-4">
        <AccountsList
          bank={bank}
          accounts={bank.accounts}
          currencies={currencies}
          onBankAccountAddedOrUpdated={onBankAccountAddedOrUpdated}
        />
        {!formDisplayed && (
          <ButtonLink onClick={() => setFormDisplayed(true)}>
            Add Bank Account
          </ButtonLink>
        )}
        {formDisplayed && (
          <AddOrEditBankAccountForm
            bank={bank}
            currencies={currencies}
            onAddedOrUpdated={(x) => {
              setFormDisplayed(false);
              onBankAccountAddedOrUpdated(x);
            }}
            onClose={() => setFormDisplayed(false)}
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
          <ButtonLink className="ml-2" onClick={() => setFormDisplayed(true)}>Edit</ButtonLink>
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

      <div className="mt-4 rounded-md border p-2">
        <AddBankForm
          displayOrder={banks.length * 100}
          onAdded={updateState(setDbBanks)}
        />
      </div>
    </ConfigPageLayout>
  );
}
