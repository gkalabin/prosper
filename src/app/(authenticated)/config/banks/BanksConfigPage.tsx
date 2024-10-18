'use client';
import {ConfigureOpenBankingConnectionLink} from '@/app/(authenticated)/config/banks/ConfigureOpenBankingConnectionLink';
import {DisconnectOpenBankingLink} from '@/app/(authenticated)/config/banks/DisconnectOpenBankingLink';
import {ReconnectOpenBankingLink} from '@/app/(authenticated)/config/banks/ReconnectOpenBankingLink';
import {AddOrEditAccountForm} from '@/components/config/AddOrEditAccountForm';
import {BankForm} from '@/components/config/BankForm';
import {
  AnchorLink,
  ButtonLink,
  ButtonPagePrimary,
} from '@/components/ui/buttons';
import {banksModelFromDatabaseData} from '@/lib/ClientSideModel';
import {DisplaySettingsContextProvider} from '@/lib/context/DisplaySettingsContext';
import {Bank, BankAccount} from '@/lib/model/BankAccount';
import {Stock} from '@/lib/model/Stock';
import {updateState} from '@/lib/stateHelpers';
import {
  Bank as DBBank,
  BankAccount as DBBankAccount,
  DisplaySettings as DBDisplaySettings,
  NordigenToken as DBNordigenToken,
  StarlingToken as DBStarlingToken,
  Stock as DBStock,
  TrueLayerToken as DBTrueLayerToken,
} from '@prisma/client';
import {useState} from 'react';

const BanksList = (props: {
  banks: Bank[];
  bankAccounts: BankAccount[];
  stocks: Stock[];
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
      {props.banks.map(bank => (
        <BanksListItem
          key={bank.id}
          bank={bank}
          bankAccounts={props.bankAccounts.filter(x => x.bankId == bank.id)}
          stocks={props.stocks}
          trueLayerToken={props.trueLayerTokens.find(t => t.bankId == bank.id)}
          nordigenToken={props.nordigenTokens.find(t => t.bankId == bank.id)}
          starlingToken={props.starlingTokens.find(t => t.bankId == bank.id)}
          onBankUpdated={props.onBankUpdated}
          onAccountAddedOrUpdated={props.onAccountAddedOrUpdated}
        />
      ))}
    </div>
  );
};

function BanksListItem({
  bank,
  bankAccounts,
  stocks,
  trueLayerToken,
  nordigenToken,
  starlingToken,
  onBankUpdated,
  onAccountAddedOrUpdated,
}: {
  bank: Bank;
  bankAccounts: BankAccount[];
  stocks: Stock[];
  trueLayerToken?: DBTrueLayerToken;
  nordigenToken?: DBNordigenToken;
  starlingToken?: DBStarlingToken;
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
                {...{trueLayerToken, nordigenToken, starlingToken, bank}}
              />
            </div>
          )}
        </div>

        {editBankFormDisplayed && (
          <div className="ml-2 mt-2">
            <BankForm
              bank={bank}
              onAddedOrUpdated={x => {
                onBankUpdated(x);
                setEditBankFormDisplayed(false);
              }}
              onClose={() => setEditBankFormDisplayed(false)}
              displayOrder={0}
            />
          </div>
        )}
      </div>

      <div className="space-y-1 px-4">
        <AccountsList
          bank={bank}
          accounts={bankAccounts}
          stocks={stocks}
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
            bankAccounts={bankAccounts}
            stocks={stocks}
            onAddedOrUpdated={x => {
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
  trueLayerToken?: DBTrueLayerToken;
  nordigenToken?: DBNordigenToken;
  starlingToken?: DBStarlingToken;
  bank: Bank;
}) => {
  if (!trueLayerToken && !nordigenToken && !starlingToken) {
    return (
      <div>
        Connect with{' '}
        <AnchorLink
          href={`/config/open-banking/starling/connect?bankId=${bank.id}`}
        >
          Starling (UK),
        </AnchorLink>{' '}
        <AnchorLink
          href={`/api/open-banking/truelayer/connect?bankId=${bank.id}`}
        >
          TrueLayer (UK)
        </AnchorLink>{' '}
        or{' '}
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

const TrueLayerActions = ({bank}: {bank: Bank}) => {
  return (
    <div className="space-x-3">
      <span>Connected with TrueLayer</span>
      <ConfigureOpenBankingConnectionLink bank={bank} />
      <ReconnectOpenBankingLink bank={bank} />
      <DisconnectOpenBankingLink bank={bank} />
    </div>
  );
};

const NordigenActions = ({bank}: {bank: Bank}) => {
  return (
    <div className="space-x-3">
      <span>Connected with Nordigen</span>
      <ConfigureOpenBankingConnectionLink bank={bank} />
      <ReconnectOpenBankingLink bank={bank} />
      <DisconnectOpenBankingLink bank={bank} />
    </div>
  );
};

const StarlingActions = ({bank}: {bank: Bank}) => {
  return (
    <div className="space-x-3">
      <span>Connected with Starling</span>
      <ConfigureOpenBankingConnectionLink bank={bank} />
      <DisconnectOpenBankingLink bank={bank} />
    </div>
  );
};

const AccountsList = (props: {
  bank: Bank;
  accounts: BankAccount[];
  stocks: Stock[];
  onAccountUpdated: (updated: DBBankAccount) => void;
}) => {
  if (!props.accounts) {
    return <div>No accounts.</div>;
  }
  const accountsForBank = props.accounts.filter(x => x.bankId == props.bank.id);
  return (
    <>
      {accountsForBank.map(account => (
        <AccountListItem
          key={account.id}
          bank={props.bank}
          account={account}
          bankAccounts={props.accounts}
          stocks={props.stocks}
          onUpdated={props.onAccountUpdated}
        />
      ))}
    </>
  );
};

const AccountListItem = (props: {
  bank: Bank;
  account: BankAccount;
  bankAccounts: BankAccount[];
  stocks: Stock[];
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
            bankAccounts={props.bankAccounts}
            bankAccount={props.account}
            stocks={props.stocks}
            onAddedOrUpdated={x => {
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

export function BanksConfigPage({
  dbBanks: dbBanksInitial,
  dbBankAccounts: dbBankAccountsInitial,
  dbStocks,
  dbTrueLayerTokens,
  dbNordigenTokens,
  dbStarlingTokens,
  dbDisplaySettings,
}: {
  dbBanks: DBBank[];
  dbBankAccounts: DBBankAccount[];
  dbStocks: DBStock[];
  dbTrueLayerTokens: DBTrueLayerToken[];
  dbNordigenTokens: DBNordigenToken[];
  dbStarlingTokens: DBStarlingToken[];
  dbDisplaySettings: DBDisplaySettings;
}) {
  const [dbBanks, setDbBanks] = useState(dbBanksInitial);
  const [dbBankAccounts, setDbBankAccounts] = useState(dbBankAccountsInitial);
  const onBankAddedOrUpdated = updateState(setDbBanks);
  const [formDisplayed, setFormDisplayed] = useState(false);
  const [banks, bankAccounts, stocks] = banksModelFromDatabaseData(
    dbBanks,
    dbBankAccounts,
    dbStocks
  );

  return (
    <DisplaySettingsContextProvider initialDbSettings={dbDisplaySettings}>
      <BanksList
        banks={banks}
        bankAccounts={bankAccounts}
        stocks={stocks}
        trueLayerTokens={dbTrueLayerTokens}
        nordigenTokens={dbNordigenTokens}
        starlingTokens={dbStarlingTokens}
        onBankUpdated={updateState(setDbBanks)}
        onAccountAddedOrUpdated={updateState(setDbBankAccounts)}
      />

      <>
        {!formDisplayed && (
          <div className="flex justify-end">
            <ButtonPagePrimary onClick={() => setFormDisplayed(true)}>
              Add New Bank
            </ButtonPagePrimary>
          </div>
        )}
      </>
      <>
        {formDisplayed && (
          <div className="mt-4 rounded-md border p-2">
            <BankForm
              displayOrder={banks.length * 100}
              onAddedOrUpdated={x => {
                onBankAddedOrUpdated(x);
                setFormDisplayed(false);
              }}
              onClose={() => setFormDisplayed(false)}
            />
          </div>
        )}
      </>
    </DisplaySettingsContextProvider>
  );
}
