'use client';
import {BanksListItem} from '@/app/(authenticated)/overview/bank';
import {
  HideBalancesContext,
  useHideBalancesFlag,
} from '@/app/(authenticated)/overview/context/hide-balances';
import {OpenBankingBalancesLoadingIndicator} from '@/app/(authenticated)/overview/OpenBankingBalancesLoadingIndicator';
import {StatsWidget} from '@/app/(authenticated)/overview/stats';
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
import {AllDatabaseData} from '@/lib/model/AllDatabaseDataModel';
import {EyeIcon, EyeSlashIcon} from '@heroicons/react/24/solid';
import {useState} from 'react';

function NonEmptyPageContent({
  hideBalances: initialHideBalances,
}: {
  hideBalances: boolean;
}) {
  const [showAddTransactionForm, setShowAddTransactionForm] = useState(true);
  const [hideBalances, setHideBalances] =
    useHideBalancesFlag(initialHideBalances);
  const {banks} = useAllDatabaseDataContext();
  return (
    <HideBalancesContext.Provider value={hideBalances}>
      <div className="space-y-4">
        <div className="flex justify-end gap-4">
          <Button onClick={() => setHideBalances(!hideBalances)}>
            {!hideBalances && (
              <>
                <EyeSlashIcon className="mr-2 h-4 w-4" />
                Hide balances
              </>
            )}
            {hideBalances && (
              <>
                <EyeIcon className="mr-2 h-4 w-4" />
                Show balances
              </>
            )}
          </Button>

          {!showAddTransactionForm && (
            <Button onClick={() => setShowAddTransactionForm(true)}>
              New Transaction
            </Button>
          )}
        </div>
        <StatsWidget />
        {showAddTransactionForm && (
          <TransactionForm
            transaction={null}
            onClose={() => setShowAddTransactionForm(false)}
          />
        )}
        <OpenBankingBalancesLoadingIndicator />
        {banks.map(bank => (
          <BanksListItem key={bank.id} bank={bank} />
        ))}
      </div>
    </HideBalancesContext.Provider>
  );
}

export function OverviewPage({
  dbData,
  hideBalances,
}: {
  dbData: AllDatabaseData;
  hideBalances: boolean;
}) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <NonEmptyPageContent hideBalances={hideBalances} />
    </AllDatabaseDataContextProvider>
  );
}
