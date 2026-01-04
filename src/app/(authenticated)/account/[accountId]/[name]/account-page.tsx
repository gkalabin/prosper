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
import {Income} from '@/lib/model/transaction/Income';
import {PersonalExpense} from '@/lib/model/transaction/PersonalExpense';
import {Transfer} from '@/lib/model/transaction/Transfer';
import {BankAccount as DBBankAccount} from '@prisma/client';
import {notFound} from 'next/navigation';
import {useState} from 'react';

function NonEmptyPageContent({accountId}: {accountId: number}) {
  const {transactions} = useTransactionDataContext();
  const {bankAccounts} = useCoreDataContext();
  const [newTransactionDialogOpen, setNewTransactionDialogOpen] =
    useState(false);
  const account = bankAccounts.find(account => account.id === accountId);
  if (!account) {
    return notFound();
  }

  const accountTransactions = transactions.filter(
    (t): t is PersonalExpense | Transfer | Income =>
      transactionBelongsToAccount(t, account)
  );
  // TODO: move padding to the root layout to have consistent paddings across the app.
  return (
    <div className="space-y-6 p-6">
      <header className="flex justify-between">
        <h1 className="text-3xl leading-7 font-semibold">{account.name}</h1>
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
  dbAccount: DBBankAccount;
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
