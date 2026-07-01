'use client';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {AccountBalancesSnapshot, balancesAsOf} from '@/lib/model/balances';
import {createContext, useContext, useMemo} from 'react';

const CurrentBalancesContext = createContext<AccountBalancesSnapshot | null>(
  null
);

// Provides a single snapshot of every account's balance as of load time,
// accumulated once and shared by the whole tree so components read balances
// without rescanning transactions.
export function CurrentBalancesProvider({
  children,
}: {
  children: JSX.Element | JSX.Element[];
}) {
  const {stocks} = useCoreDataContext();
  const {transactions} = useTransactionDataContext();
  const balances = useMemo(
    () => balancesAsOf(transactions, stocks, Date.now()),
    [transactions, stocks]
  );
  return (
    <CurrentBalancesContext.Provider value={balances}>
      {children}
    </CurrentBalancesContext.Provider>
  );
}

export function useCurrentBalances(): AccountBalancesSnapshot {
  const ctx = useContext(CurrentBalancesContext);
  if (!ctx) {
    throw new Error('CurrentBalancesContext is not configured');
  }
  return ctx;
}
