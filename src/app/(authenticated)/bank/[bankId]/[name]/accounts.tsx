import {BankAccountListItem} from '@/app/(authenticated)/overview/bank';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {accountsForBank, Bank} from '@/lib/model/BankAccount';
import {RectangleStackIcon} from '@heroicons/react/24/outline';

export function Accounts({bank}: {bank: Bank}) {
  const {bankAccounts} = useAllDatabaseDataContext();
  // TODO: show archived accounts too, but with a different style.
  const accounts = accountsForBank(bank, bankAccounts).filter(a => !a.archived);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Bank Accounts</CardTitle>
        <RectangleStackIcon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-gray-200">
          {accounts.map((account, i) => (
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
