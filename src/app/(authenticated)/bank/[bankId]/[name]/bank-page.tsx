'use client';
import {Accounts} from '@/app/(authenticated)/bank/[bankId]/[name]/accounts';
import {accountsSum} from '@/app/(authenticated)/overview/modelHelpers';
import {
  isFullyConfigured,
  NotConfiguredYet,
} from '@/components/NotConfiguredYet';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {
  CoreDataContextProvider,
  useCoreDataContext,
} from '@/lib/context/CoreDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {
  MarketDataContextProvider,
  useMarketDataContext,
} from '@/lib/context/MarketDataContext';
import {
  TransactionDataContextProvider,
  useTransactionDataContext,
} from '@/lib/context/TransactionDataContext';
import {AllDatabaseData} from '@/lib/model/AllDatabaseDataModel';
import {accountsForBank} from '@/lib/model/BankAccount';
import {CurrencyDollarIcon} from '@heroicons/react/24/outline';
import {Bank as DBBank} from '@prisma/client';
import {notFound} from 'next/navigation';

function NonEmptyPageContent({bankId}: {bankId: number}) {
  const displayCurrency = useDisplayCurrency();
  const {banks, stocks, bankAccounts} = useCoreDataContext();
  const {exchange} = useMarketDataContext();
  const {transactions} = useTransactionDataContext();
  const bank = banks.find(bank => bank.id === bankId);
  if (!bank) {
    return notFound();
  }

  const accounts = accountsForBank(bank, bankAccounts);
  const bankTotal = accountsSum(
    accounts,
    displayCurrency,
    exchange,
    transactions,
    stocks
  );
  // TODO: move padding to the root layout to have consistent paddings across the app.
  return (
    <div className="space-y-6 p-6">
      <header className="text-3xl font-semibold leading-7">{bank.name}</header>
      <main className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <CurrencyDollarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Balance amount={bankTotal} />
            </div>
            {/* TODO: add stats and chart https://github.com/shadcn-ui/ui/blob/805ed4120a6a8ae6f6e9714cbd776e18eeba92c7/apps/www/registry/default/example/cards/stats.tsx#L60 */}
          </CardContent>
        </Card>
        <Accounts bank={bank} />
      </main>
    </div>
  );
}

function Balance({amount}: {amount: AmountWithCurrency | undefined}) {
  if (!amount) {
    return null;
  }
  return <>{amount.round().format()}</>;
}

export function BankPage({
  dbData,
  dbBank,
}: {
  dbData: AllDatabaseData;
  dbBank: DBBank;
}) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <CoreDataContextProvider dbData={dbData}>
      <TransactionDataContextProvider dbData={dbData}>
        <MarketDataContextProvider dbData={dbData}>
          <NonEmptyPageContent bankId={dbBank.id} />
        </MarketDataContextProvider>
      </TransactionDataContextProvider>
    </CoreDataContextProvider>
  );
}
