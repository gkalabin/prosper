import {
  Bank as DBBank,
  BankAccount as DBBankAccount,
  Currency as DBCurrency,
  NordigenToken as DBNordigenToken,
  TrueLayerToken as DBTrueLayerToken,
  StarlingToken as DBStarlingToken,
} from "@prisma/client";
import { ConfigPageLayout } from "components/ConfigPageLayout";
import { AddOrEditAccountForm } from "components/config/AddOrEditAccountForm";
import { AddOrEditBankForm } from "components/config/AddOrEditBankForm";
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
  trueLayerTokens: DBTrueLayerToken[];
  nordigenTokens: DBNordigenToken[];
  starlingTokens: DBStarlingToken[];
  onBankUpdated: (updated: DBBank) => void;
  onAccountAddedOrUpdated: (x: DBBankAccount) => void;
}) => {
  if (!props.banks) {
    return <div>No banks found.</div>;
  }
  return (
    <div className="space-y-4">
      {props.banks.map((bank) => (
        <BanksListItem
          key={bank.id}
          bank={bank}
          trueLayerToken={props.trueLayerTokens.find(
            (t) => t.bankId == bank.id
          )}
          nordigenToken={props.nordigenTokens.find((t) => t.bankId == bank.id)}
          starlingToken={props.starlingTokens.find((t) => t.bankId == bank.id)}
          currencies={props.currencies}
          onBankUpdated={props.onBankUpdated}
          onAccountAddedOrUpdated={props.onAccountAddedOrUpdated}
        />
      ))}
    </div>
  );
};

function BanksListItem({
  bank,
  currencies,
  trueLayerToken,
  nordigenToken,
  starlingToken,
  onBankUpdated,
  onAccountAddedOrUpdated,
}: {
  bank: Bank;
  currencies: Currencies;
  trueLayerToken: DBTrueLayerToken;
  nordigenToken: DBNordigenToken;
  starlingToken: DBStarlingToken;
  onBankUpdated: (updated: DBBank) => void;
  onAccountAddedOrUpdated: (x: DBBankAccount) => void;
}) {
  const [newAccountFormDisplayed, setNewAccountFormDisplayed] = useState(false);
  const [editBankFormDisplayed, setEditBankFormDisplayed] = useState(false);
  return (
    <div className="rounded-md border">
      <div className="border-b bg-indigo-200 p-2 text-gray-900">
        <div>
          <div className="flex items-center">
            <h1 className="grow text-xl font-medium">
              {editBankFormDisplayed ? `Editing ${bank.name}` : bank.name}
            </h1>
            {!editBankFormDisplayed && (
              <ButtonLink onClick={() => setEditBankFormDisplayed(true)}>
                Edit
              </ButtonLink>
            )}
          </div>
          {!editBankFormDisplayed && (
            <div className="text-sm text-gray-600">
              <BankConnections
                {...{ trueLayerToken, nordigenToken, starlingToken, bank }}
              />
            </div>
          )}
        </div>

        {editBankFormDisplayed && (
          <div className="ml-2 mt-2">
            <AddOrEditBankForm
              bank={bank}
              onAddedOrUpdated={(x) => {
                onBankUpdated(x);
                setEditBankFormDisplayed(false);
              }}
              onCancelClick={() => setEditBankFormDisplayed(false)}
              displayOrder={0}
            />
          </div>
        )}
      </div>

      <div className="space-y-1 px-4">
        <AccountsList
          bank={bank}
          accounts={bank.accounts}
          currencies={currencies}
          onAccountUpdated={onAccountAddedOrUpdated}
        />
        {!newAccountFormDisplayed && (
          <ButtonLink onClick={() => setNewAccountFormDisplayed(true)}>
            Add New Account
          </ButtonLink>
        )}
        {newAccountFormDisplayed && (
          <AddOrEditAccountForm
            bank={bank}
            currencies={currencies}
            onAddedOrUpdated={(x) => {
              setNewAccountFormDisplayed(false);
              onAccountAddedOrUpdated(x);
            }}
            onClose={() => setNewAccountFormDisplayed(false)}
          />
        )}
      </div>
    </div>
  );
}

const BankConnections = ({
  trueLayerToken,
  nordigenToken,
  starlingToken,
  bank,
}: {
  trueLayerToken: DBTrueLayerToken;
  nordigenToken: DBNordigenToken;
  starlingToken: DBStarlingToken;
  bank: Bank;
}) => {
  if (!trueLayerToken && !nordigenToken && !starlingToken) {
    return (
      <div>
        Connect with{" "}
        <AnchorLink
          href={`/config/open-banking/starling/connect?bankId=${bank.id}`}
        >
          Starling (UK),
        </AnchorLink>{" "}
        <AnchorLink href={`/api/open-banking/connect?bankId=${bank.id}`}>
          TrueLayer (UK)
        </AnchorLink>{" "}
        or{" "}
        <AnchorLink
          href={`/config/open-banking/nordigen/connect?bankId=${bank.id}`}
        >
          Nordigen (EU+UK)
        </AnchorLink>
      </div>
    );
  }
  return (
    <>
      {trueLayerToken && <TrueLayerActions bank={bank} />}
      {nordigenToken && <NordigenActions bank={bank} />}
      {starlingToken && <StarlingActions bank={bank} />}
    </>
  );
};

const TrueLayerActions = ({ bank }: { bank: Bank }) => {
  return (
    <div className="space-x-3">
      <span>Connected with TrueLayer</span>
      <AnchorLink href={`/config/open-banking/mapping?bankId=${bank.id}`}>
        Configure
      </AnchorLink>
      <AnchorLink
        href={`/api/open-banking/reconnect?bankId=${bank.id}`}
      >
        Reconnect
      </AnchorLink>
    </div>
  );
};

const NordigenActions = ({ bank }: { bank: Bank }) => {
  return (
    <div className="space-x-3">
      <span>Connected with Nordigen</span>
      <AnchorLink href={`/config/open-banking/mapping?bankId=${bank.id}`}>
        Configure
      </AnchorLink>
      <AnchorLink
        href={`/api/open-banking/reconnect?bankId=${bank.id}`}
      >
        Reconnect
      </AnchorLink>
    </div>
  );
};

const StarlingActions = ({ bank }: { bank: Bank }) => {
  return (
    <div className="space-x-3">
      <span>Connected with Starling</span>
      <AnchorLink href={`/config/open-banking/mapping?bankId=${bank.id}`}>
        Configure
      </AnchorLink>
      <AnchorLink href={`!!!TODO`}>Delete connection</AnchorLink>
    </div>
  );
};

const AccountsList = (props: {
  bank: Bank;
  accounts: BankAccount[];
  currencies: Currencies;
  onAccountUpdated: (updated: DBBankAccount) => void;
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
          onUpdated={props.onAccountUpdated}
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
          <AddOrEditAccountForm
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
    dbTrueLayerTokens: DBTrueLayerToken[];
    dbNordigenTokens: DBNordigenToken[];
    dbStarlingTokens: DBStarlingToken[];
  };
}> = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    return { props: {} };
  }
  const db = await DB.fromContext(context);
  const dbCurrencies = await db.currencyFindMany();
  const dbBanks = await db.bankFindMany();
  const whereBankId = {
    where: {
      bankId: {
        in: dbBanks.map((x) => x.id),
      },
    },
  };
  const dbBankAccounts = await db.bankAccountFindMany(whereBankId);
  const dbTrueLayerTokens = await db.trueLayerTokenFindMany(whereBankId);
  const dbNordigenTokens = await db.nordigenTokenFindMany(whereBankId);
  const dbStarlingTokens = await db.starlingTokenFindMany(whereBankId);

  const props = {
    session,
    data: {
      dbBanks,
      dbBankAccounts,
      dbCurrencies,
      dbTrueLayerTokens,
      dbNordigenTokens,
      dbStarlingTokens,
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
    dbTrueLayerTokens,
    dbNordigenTokens,
    dbStarlingTokens,
  },
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [dbBanks, setDbBanks] = useState(dbBanksInitial);
  const [dbBankAccounts, setDbBankAccounts] = useState(dbBankAccountsInitial);
  const onBankAddedOrUpdated = updateState(setDbBanks);
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
        trueLayerTokens={dbTrueLayerTokens}
        nordigenTokens={dbNordigenTokens}
        starlingTokens={dbStarlingTokens}
        currencies={currencies}
        onBankUpdated={updateState(setDbBanks)}
        onAccountAddedOrUpdated={updateState(setDbBankAccounts)}
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
            onAddedOrUpdated={(x) => {
              onBankAddedOrUpdated(x);
              setFormDisplayed(false);
            }}
            onCancelClick={() => setFormDisplayed(false)}
          />
        </div>
      )}
    </ConfigPageLayout>
  );
}
