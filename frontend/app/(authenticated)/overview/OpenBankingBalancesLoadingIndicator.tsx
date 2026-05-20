'use client';
import {
  useOpenBankingBalances,
  useOpenBankingTransactions,
} from '@/lib/openbanking/context';

export function OpenBankingBalancesLoadingIndicator() {
  const {isError: obBalancesError, isLoading: obBalancesLoading} =
    useOpenBankingBalances();
  // Just trigger the loading of transactions, so they are cached for later.
  useOpenBankingTransactions();
  return (
    <>
      {obBalancesError && (
        <div className="rounded border bg-red-100 p-2 text-lg font-medium text-gray-900">
          Error loading Open Banking balances
        </div>
      )}
      {obBalancesLoading && (
        <div className="rounded border bg-yellow-50 p-2 text-base font-normal text-gray-900">
          Loading Open Banking balances...
        </div>
      )}
    </>
  );
}
