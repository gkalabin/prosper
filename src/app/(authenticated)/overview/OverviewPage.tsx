'use client';
import {BanksListItem} from '@/app/(authenticated)/overview/bank';
import {
  HideBalancesContextProvider,
  ToggleHideBalancesButton,
} from '@/app/(authenticated)/overview/hide-balances';
import {OpenBankingBalancesLoadingIndicator} from '@/app/(authenticated)/overview/OpenBankingBalancesLoadingIndicator';
import {StatsWidget} from '@/app/(authenticated)/overview/stats';
import {
  isFullyConfigured,
  NotConfiguredYet,
} from '@/components/NotConfiguredYet';
import {Button} from '@/components/ui/button';
import {
  CoreDataContextProvider,
  useCoreDataContext,
} from '@/lib/context/CoreDataContext';
import {MarketDataContextProvider} from '@/lib/context/MarketDataContext';
import {TransactionDataContextProvider} from '@/lib/context/TransactionDataContext';
import {AllDatabaseData} from '@/lib/model/AllDatabaseDataModel';
import Link from 'next/link';

function NonEmptyPageContent({hideBalances}: {hideBalances: boolean}) {
  const {banks} = useCoreDataContext();
  return (
    <HideBalancesContextProvider initialHideBalances={hideBalances}>
      <div className="space-y-4">
        <div className="flex justify-end gap-4">
          <ToggleHideBalancesButton />
          <Button asChild>
            <Link href="/new">New Transaction</Link>
          </Button>
        </div>
        <StatsWidget />
        <OpenBankingBalancesLoadingIndicator />
        {banks.map(bank => (
          <BanksListItem key={bank.id} bank={bank} />
        ))}
      </div>
    </HideBalancesContextProvider>
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
    <CoreDataContextProvider dbData={dbData}>
      <TransactionDataContextProvider dbData={dbData}>
        <MarketDataContextProvider dbData={dbData}>
          <NonEmptyPageContent hideBalances={hideBalances} />
        </MarketDataContextProvider>
      </TransactionDataContextProvider>
    </CoreDataContextProvider>
  );
}
