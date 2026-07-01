'use client';
import {AppDataContextProviders} from '@/lib/context/AppDataContextProviders';
import {BanksListItem} from '@/app/(authenticated)/overview/bank';
import {
  HideBalancesContextProvider,
  ToggleHideBalancesButton,
} from '@/app/(authenticated)/overview/hide-balances';
import {RecentTransactions} from '@/app/(authenticated)/overview/recent';
import {NetWorthHero} from '@/app/(authenticated)/overview/stats';
import {
  isFullyConfigured,
  NotConfiguredYet,
} from '@/components/NotConfiguredYet';
import {Button} from '@/components/ui/button';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {GetConnectionStatusResponse} from '@/lib/grpc/gen/prosper/v1/openbanking';
import {AppData} from '@/lib/model/AppDataModel';
import {OpenBankingConnectionStatusContextProvider} from '@/lib/openbanking/context';
import Link from 'next/link';

function NonEmptyPageContent({hideBalances}: {hideBalances: boolean}) {
  const {banks} = useCoreDataContext();
  return (
    <HideBalancesContextProvider initialHideBalances={hideBalances}>
      <div className="space-y-5">
        <div className="flex justify-end gap-3">
          <ToggleHideBalancesButton />
          <Button asChild>
            <Link href="/new">New Transaction</Link>
          </Button>
        </div>
        <NetWorthHero />
        <section aria-labelledby="banks-heading" className="space-y-3">
          <h2
            id="banks-heading"
            className="text-muted-foreground px-1 text-xs font-bold uppercase tracking-[0.13em]"
          >
            Banks &amp; accounts
          </h2>
          {banks.map(bank => (
            <BanksListItem key={bank.id} bank={bank} />
          ))}
        </section>
        <RecentTransactions />
      </div>
    </HideBalancesContextProvider>
  );
}

export function OverviewPage({
  dbData,
  connectionStatus,
  hideBalances,
}: {
  dbData: AppData;
  connectionStatus: GetConnectionStatusResponse;
  hideBalances: boolean;
}) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AppDataContextProviders dbData={dbData}>
      <OpenBankingConnectionStatusContextProvider dbData={connectionStatus}>
        <NonEmptyPageContent hideBalances={hideBalances} />
      </OpenBankingConnectionStatusContextProvider>
    </AppDataContextProviders>
  );
}
