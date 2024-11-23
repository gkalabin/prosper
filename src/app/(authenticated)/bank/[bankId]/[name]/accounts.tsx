import {BankAccountListItem} from '@/app/(authenticated)/overview/accounts';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {accountsForBank, Bank} from '@/lib/model/BankAccount';
import {cn} from '@/lib/utils';
import {RectangleStackIcon} from '@heroicons/react/24/outline';

// TODO: do not duplicate, move the whole component to a common place.
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

export function Accounts({bank}: {bank: Bank}) {
  const {bankAccounts} = useAllDatabaseDataContext();
  const accounts = accountsForBank(bank, bankAccounts);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Bank Accounts</CardTitle>
        <RectangleStackIcon className="h-4 w-4 text-muted-foreground" />
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
