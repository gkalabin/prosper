'use client';
import {BalanceCard} from '@/app/(authenticated)/account/[accountId]/[name]/balance';
import {transactionBelongsToAccount} from '@/app/(authenticated)/overview/modelHelpers';
import {
  isFullyConfigured,
  NotConfiguredYet,
} from '@/components/NotConfiguredYet';
import {TransactionsList} from '@/components/transactions/TransactionsList';
import {NewTransactionFormDialog} from '@/components/txform/TransactionForm';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
  CoreDataContextProvider,
  useCoreDataContext,
} from '@/lib/context/CoreDataContext';
import {MarketDataContextProvider} from '@/lib/context/MarketDataContext';
import {
  TransactionDataContextProvider,
  useTransactionDataContext,
} from '@/lib/context/TransactionDataContext';
import {BankAccount as ProtoBankAccount} from '@/lib/grpc/gen/prosper/v1/ledger';
import {AppData} from '@/lib/model/AppDataModel';
import {useTransactionSearch} from '@/lib/search/useTransactionSearch';
import {notFound} from 'next/navigation';
import {useState} from 'react';

function NonEmptyPageContent({accountId}: {accountId: number}) {
  const {transactions} = useTransactionDataContext();
  const {bankAccounts} = useCoreDataContext();
  const [newTransactionDialogOpen, setNewTransactionDialogOpen] =
    useState(false);
  const account = bankAccounts.find(account => account.id === accountId);
  const accountTransactions = transactions.filter(
    t => !!account && transactionBelongsToAccount(t, account)
  );
  const [query, setQuery] = useState('');
  const {results, error} = useTransactionSearch(accountTransactions, query);
  if (!account) {
    return notFound();
  }
  // TODO: move padding to the root layout to have consistent paddings across the app.
  return (
    <div className="space-y-6 p-6">
      <header className="flex justify-between">
        <h1 className="text-3xl font-semibold leading-7">{account.name}</h1>
        <Button onClick={() => setNewTransactionDialogOpen(true)}>
          New Transaction
        </Button>
      </header>
      <main className="space-y-4">
        <BalanceCard account={account} />
        <div className="space-y-2">
          <h2 className="text-sm font-medium">Transactions</h2>
          <Input
            type="search"
            placeholder="Search transactions"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {error && (
            <div className="text-destructive text-sm font-medium">
              {error.message}:
              {error.getErrors().map(e => (
                <div key={e} className="ml-2">
                  {e}
                </div>
              ))}
            </div>
          )}
          <TransactionsList transactions={results} account={account} />
        </div>
      </main>
      <NewTransactionFormDialog
        transaction={null}
        open={newTransactionDialogOpen}
        onOpenChange={setNewTransactionDialogOpen}
      />
    </div>
  );
}

export function AccountPage({
  dbData,
  dbAccount,
}: {
  dbData: AppData;
  dbAccount: ProtoBankAccount;
}) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <CoreDataContextProvider dbData={dbData}>
      <TransactionDataContextProvider dbData={dbData}>
        <MarketDataContextProvider dbData={dbData}>
          <NonEmptyPageContent accountId={dbAccount.id} />
        </MarketDataContextProvider>
      </TransactionDataContextProvider>
    </CoreDataContextProvider>
  );
}
