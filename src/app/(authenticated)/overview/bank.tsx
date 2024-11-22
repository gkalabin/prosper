'use client';
import {BankAccountListItem} from '@/app/(authenticated)/overview/accounts';
import {useHideBalancesContext} from '@/app/(authenticated)/overview/context/hide-balances';
import {accountsSum} from '@/app/(authenticated)/overview/modelHelpers';
import {OpenBankingConnectionExpirationWarning} from '@/app/(authenticated)/overview/OpenBankingConnectionExpirationWarning';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {Bank, accountsForBank} from '@/lib/model/BankAccount';
import {cn} from '@/lib/utils';

const ITEM_BORDER_COLORS = [
  'bg-red-400',
  'bg-orange-400',
  'bg-amber-400',
  'bg-yellow-400',
  'bg-lime-400',
  'bg-green-400',
  'bg-emerald-400',
  'bg-teal-400',
  'bg-cyan-400',
  'bg-sky-400',
  'bg-blue-400',
  'bg-indigo-400',
  'bg-violet-400',
  'bg-purple-400',
  'bg-fuchsia-400',
  'bg-pink-400',
  'bg-rose-400',
];

export function BanksListItem({bank}: {bank: Bank}) {
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
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex justify-between">
            <div>{bank.name}</div>
            <Balance amount={bankTotal} />
          </div>
        </CardTitle>
        <CardDescription>
          <OpenBankingConnectionExpirationWarning bank={bank} />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-gray-200">
          {accounts
            .filter(a => !a.archived)
            .map((account, i) => (
              <div key={account.id} className="flex gap-2 py-3">
                <div
                  className={cn(
                    'w-1 rounded',
                    ITEM_BORDER_COLORS[i % ITEM_BORDER_COLORS.length]
                  )}
                >
                  &nbsp;
                </div>
                <div className="grow p-1">
                  <BankAccountListItem account={account} />
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Balance({amount}: {amount: AmountWithCurrency | undefined}) {
  const hideBalances = useHideBalancesContext();
  if (!amount || hideBalances) {
    return null;
  }
  return <>{amount.round().format()}</>;
}
