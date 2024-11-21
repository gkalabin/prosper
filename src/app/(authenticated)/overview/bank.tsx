'use client';
import {BankAccountListItem} from '@/app/(authenticated)/overview/accounts';
import {useHideBalancesContext} from '@/app/(authenticated)/overview/context/hide-balances';
import {accountsSum} from '@/app/(authenticated)/overview/modelHelpers';
import {OpenBankingConnectionExpirationWarning} from '@/app/(authenticated)/overview/OpenBankingConnectionExpirationWarning';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {Bank, accountsForBank} from '@/lib/model/BankAccount';

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
    <div className="rounded border">
      <div className="border-b bg-indigo-200 p-2">
        <div className="flex gap-2 text-xl font-medium text-gray-900">
          <div>{bank.name}</div>
          <div>
            <Balance amount={bankTotal} />
          </div>
        </div>
        <OpenBankingConnectionExpirationWarning bank={bank} />
      </div>

      <div className="divide-y divide-gray-200">
        {accounts
          .filter(a => !a.archived)
          .map(account => (
            <BankAccountListItem key={account.id} account={account} />
          ))}
      </div>
    </div>
  );
}

function Balance({amount}: {amount: AmountWithCurrency | undefined}) {
  const hideBalances = useHideBalancesContext();
  if (!amount || hideBalances) {
    return null;
  }
  return <>{amount.format()}</>;
}
