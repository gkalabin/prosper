'use client';
import {BalanceCard} from '@/app/(authenticated)/account/[accountId]/[name]/balance';
import {
  isFullyConfigured,
  NotConfiguredYet,
} from '@/components/NotConfiguredYet';
import {TransactionsList} from '@/components/transactions/list/TransactionsList';
import {NewTransactionFormDialog} from '@/components/txform/TransactionForm';
import {Button} from '@/components/ui/button';
import {
  CoreDataContextProvider,
  useCoreDataContext,
} from '@/lib/context/CoreDataContext';
import {MarketDataContextProvider} from '@/lib/context/MarketDataContext';
import {
  TransactionDataContextProvider,
  useTransactionDataContext,
} from '@/lib/context/TransactionDataContext';
import {AllDatabaseData} from '@/lib/model/AllDatabaseDataModel';
import {findAccountTransactions} from '@/lib/model/queries/AccountTransactions';
import {AccountNEW as DBAccountNEW} from '@prisma/client';
import {notFound} from 'next/navigation';
import {useState} from 'react';

function NonEmptyPageContent({accountId}: {accountId: number}) {
  const {transactions} = useTransactionDataContext();
  const {accounts} = useCoreDataContext();
  const [newTransactionDialogOpen, setNewTransactionDialogOpen] =
    useState(false);
  const account = accounts.find(account => account.id === accountId);
  if (!account) {
    return notFound();
  }
  const accountTransactions = findAccountTransactions({account, transactions});
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
        <div>
          <h2 className="text-sm font-medium">Latest transactions</h2>
          <TransactionsList transactions={accountTransactions} />
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
  dbData: AllDatabaseData;
  dbAccount: DBAccountNEW;
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
