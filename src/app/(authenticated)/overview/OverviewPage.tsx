'use client';
import {BankAccountListItem} from '@/app/(authenticated)/overview/AccountListItem';
import {accountsSum} from '@/app/(authenticated)/overview/modelHelpers';
import {OpenBankingConnectionExpirationWarning} from '@/app/(authenticated)/overview/OpenBankingConnectionExpirationWarning';
import {StatsWidget} from '@/app/(authenticated)/overview/StatsWidget';
import {
  isFullyConfigured,
  NotConfiguredYet,
} from '@/components/NotConfiguredYet';
import {TransactionForm} from '@/components/txform/TransactionForm';
import {Button} from '@/components/ui/button';
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from '@/lib/context/AllDatabaseDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {AllDatabaseData} from '@/lib/model/AllDatabaseDataModel';
import {accountsForBank, Bank} from '@/lib/model/BankAccount';
import {
  useOpenBankingBalances,
  useOpenBankingTransactions,
} from '@/lib/openbanking/context';
import {useState} from 'react';

export const BanksList = ({banks}: {banks: Bank[]}) => {
  return (
    <div className="space-y-4">
      {banks.map(bank => (
        <BanksListItem key={bank.id} bank={bank} />
      ))}
    </div>
  );
};

const BanksListItem = ({bank}: {bank: Bank}) => {
  const displayCurrency = useDisplayCurrency();
  const {exchange, stocks, transactions, bankAccounts} =
    useAllDatabaseDataContext();
  const accounts = accountsForBank(bank, bankAccounts);
  const bankTotal = accountsSum(
    accounts,
    displayCurrency,
    exchange,
    transactions,
    stocks
  );
  return (
    <div className="rounded border">
      <div className="border-b bg-indigo-200 p-2">
        <div className="text-xl font-medium text-gray-900">
          {bank.name}
          {bankTotal && <span className="ml-2">{bankTotal.format()}</span>}
        </div>
        <OpenBankingConnectionExpirationWarning bank={bank} />
      </div>

      <div className="divide-y divide-gray-200">
        {accounts
          .filter(a => !a.archived)
          .map(account => (
            <BankAccountListItem key={account.id} account={account} />
          ))}
      </div>
    </div>
  );
};

function OpenBankingBalancesLoadingIndicator() {
  const {isError: obBalancesError, isLoading: obBalancesLoading} =
    useOpenBankingBalances();
  // Just trigger the loading of transactions, so they are cached for later.
  useOpenBankingTransactions();
  return (
    <>
      {obBalancesError && (
        <div className="rounded border bg-red-100 p-2 text-lg font-medium text-gray-900">
          Error loading Open Banking balances
        </div>
      )}
      {obBalancesLoading && (
        <div className="rounded border bg-yellow-50 p-2 text-base font-normal text-gray-900">
          Loading Open Banking balances...
        </div>
      )}
    </>
  );
}

function NonEmptyPageContent() {
  const [showAddTransactionForm, setShowAddTransactionForm] = useState(true);
  const {banks} = useAllDatabaseDataContext();
  return (
    <div className="space-y-4">
      <StatsWidget />
      <div className="mb-4">
        {!showAddTransactionForm && (
          <div className="flex justify-end">
            <Button onClick={() => setShowAddTransactionForm(true)}>
              New Transaction
            </Button>
          </div>
        )}
        {showAddTransactionForm && (
          <TransactionForm
            transaction={null}
            onClose={() => setShowAddTransactionForm(false)}
          />
        )}
      </div>
      <OpenBankingBalancesLoadingIndicator />
      <BanksList banks={banks} />
    </div>
  );
}

export function OverviewPage({dbData}: {dbData: AllDatabaseData}) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <NonEmptyPageContent />
    </AllDatabaseDataContextProvider>
  );
}
