'use client';
import {useHideBalancesContext} from '@/app/(authenticated)/overview/context/hide-balances';
import {accountsSum} from '@/app/(authenticated)/overview/modelHelpers';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {accountUnit} from '@/lib/model/BankAccount';
import {isCurrency} from '@/lib/model/Unit';

export function StatsWidget() {
  const displayCurrency = useDisplayCurrency();
  const {bankAccounts, transactions, exchange, stocks} =
    useAllDatabaseDataContext();
  const hideBalances = useHideBalancesContext();
  const total = accountsSum(
    bankAccounts,
    displayCurrency,
    exchange,
    transactions,
    stocks
  );
  if (!total || hideBalances) {
    return <></>;
  }
  const totalCash = accountsSum(
    bankAccounts.filter(a => isCurrency(accountUnit(a, stocks))),
    displayCurrency,
    exchange,
    transactions,
    stocks
  );
  return (
    <div className="rounded border">
      <h2 className="bg-indigo-300 p-2 text-2xl font-medium text-gray-900">
        Total {total.format()}
      </h2>
      <div className="grid grid-cols-2 px-3 py-2">
        {totalCash && (
          <>
            <span className="text-lg font-medium">Cash</span>{' '}
            {totalCash.format()}
            <span className="text-lg font-medium">Equity</span>{' '}
            {total.subtract(totalCash).format()}
          </>
        )}
      </div>
    </div>
  );
}
