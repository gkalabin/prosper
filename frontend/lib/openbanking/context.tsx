import {
  GetBalancesResponse,
  GetConnectionStatusResponse,
  GetFetchStatusResponse,
} from '@/lib/grpc/gen/prosper/v1/openbanking';
import {timestampToEpoch} from '@/lib/grpc/timestamp';
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

export const useOpenBankingLastFetched = () => {
  const fetcher = (url: string) =>
    fetch(url)
      .then(r => r.json())
      .then(json => GetFetchStatusResponse.fromJson(json));
  const {data, error, isLoading} = useSWR<GetFetchStatusResponse>(
    '/api/open-banking/fetch-status',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  // Epoch millis of each account's most recent successful fetch, keyed by
  // internal account id. Accounts that have never been fetched are absent.
  const lastFetchedAt: Record<number, number> = {};
  for (const status of data?.statuses ?? []) {
    if (!status.lastFetchedAt) {
      continue;
    }
    lastFetchedAt[status.internalAccountId] = timestampToEpoch(
      status.lastFetchedAt
    );
  }
  return {
    lastFetchedAt,
    isLoading,
    isError: !!error,
  };
};
