import {
  GetBalancesResponse,
  GetConnectionStatusResponse,
  GetOpenBankingTransactionsResponse,
} from '@/lib/grpc/gen/prosper/v1/openbanking';
import {timestampToEpoch} from '@/lib/grpc/timestamp';
import {fromOpenBankingTransaction} from '@/lib/txsuggestions/TransactionPrototype';
import useSWR from 'swr';

export const useOpenBankingExpirations = () => {
  const fetcher = (url: string) =>
    fetch(url)
      .then(r => r.json())
      .then(json => GetConnectionStatusResponse.fromJson(json));
  const {data, error, isLoading} = useSWR<GetConnectionStatusResponse>(
    '/api/open-banking/connection-status',
    fetcher
  );
  return {
    expirations: data?.expirations,
    isLoading,
    isError: !!error,
  };
};

export const useOpenBankingBalances = () => {
  const fetcher = (url: string) =>
    fetch(url)
      .then(r => r.json())
      .then(json => GetBalancesResponse.fromJson(json));
  const {data, error, isLoading} = useSWR<GetBalancesResponse>(
    '/api/open-banking/balances',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  return {
    balances: data?.accounts,
    isLoading,
    isError: !!error,
  };
};

export const useOpenBankingTransactions = () => {
  const fetcher = (url: string) =>
    fetch(url)
      .then(r => r.json())
      .then(json => GetOpenBankingTransactionsResponse.fromJson(json));
  const {data, error, isLoading} = useSWR<GetOpenBankingTransactionsResponse>(
    '/api/open-banking/transactions',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  const transactions = data?.accounts.flatMap(acc =>
    acc.transactions.map(t =>
      fromOpenBankingTransaction(t, acc.internalAccountId)
    )
  );
  // Epoch millis of each account's most recent successful fetch, keyed by
  // internal account id. Accounts that have never been fetched are absent.
  const lastFetchedAt: Record<number, number> = {};
  for (const acc of data?.accounts ?? []) {
    if (acc.lastFetchedAt) {
      lastFetchedAt[acc.internalAccountId] = timestampToEpoch(
        acc.lastFetchedAt
      );
    }
  }
  return {
    transactions,
    lastFetchedAt,
    isLoading,
    isError: !!error,
  };
};
