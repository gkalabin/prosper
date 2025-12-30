'use client';
import {
  AccountBalance,
  BankBalance,
} from '@/app/(authenticated)/overview/balance';
import {accountsSum} from '@/app/(authenticated)/overview/modelHelpers';
import {OpenBankingConnectionExpirationWarning} from '@/app/(authenticated)/overview/OpenBankingConnectionExpirationWarning';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {useMarketDataContext} from '@/lib/context/MarketDataContext';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {
  Bank,
  BankAccount,
  accountPageURL,
  accountsForBank,
  bankPageURL,
} from '@/lib/model/BankAccount';
import {cn} from '@/lib/utils';
import Link from 'next/link';

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
  const {stocks, bankAccounts} = useCoreDataContext();
  const {exchange} = useMarketDataContext();
  const {transactions} = useTransactionDataContext();
  const accounts = accountsForBank(bank, bankAccounts);
  const bankTotal = accountsSum(
    accounts,
    displayCurrency,
    exchange,
    transactions,
    stocks
  );
  const activeAccounts = accounts.filter(a => !a.archived);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex justify-between">
            <div>
              <Link href={bankPageURL(bank)}>{bank.name}</Link>
            </div>
            <BankBalance amount={bankTotal} />
          </div>
        </CardTitle>
        <CardDescription>
          <OpenBankingConnectionExpirationWarning bank={bank} />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-gray-200">
          {activeAccounts.map((account, i) => (
            <BankAccountListItem
              key={account.id}
              account={account}
              bank={bank}
              colorIndex={i}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function BankAccountListItem({
  account,
  bank,
  colorIndex,
}: {
  account: BankAccount;
  bank: Bank;
  colorIndex: number;
}) {
  const listColor = ITEM_BORDER_COLORS[colorIndex % ITEM_BORDER_COLORS.length];
  return (
    <div>
      <Link href={accountPageURL(account, bank)}>
        <div key={account.id} className="flex items-stretch gap-2 py-2.5">
          <div
            className={cn(
              'w-1 rounded',
              account.archived ? 'bg-gray-300' : listColor
            )}
          >
            &nbsp;
          </div>
          <div
            className={cn(
              'flex min-h-12 grow items-center justify-between p-1',
              account.archived && 'text-muted-foreground'
            )}
          >
            <div>{account.name}</div>
            <AccountBalance account={account} />
          </div>
        </div>
      </Link>
    </div>
  );
}
