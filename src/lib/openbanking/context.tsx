import {OpenBankingBalances} from '@/app/api/open-banking/balances/route';
import {OpenBankingTransactions} from '@/app/api/open-banking/transactions/route';
import useSWR from 'swr';

export const useOpenBankingExpirations = () => {
  const fetcher = (url: string) => fetch(url).then(r => r.json());
  const {data, error, isLoading} = useSWR<OpenBankingBalances>(
    '/api/open-banking/balances',
    fetcher
  );
  return {
    expirations: data?.expirations,
    isLoading,
    isError: !!error,
  };
};

export const useOpenBankingBalances = () => {
  const fetcher = (url: string) => fetch(url).then(r => r.json());
  const {data, error, isLoading} = useSWR<OpenBankingBalances>(
    '/api/open-banking/balances',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateOnMount: false,
    }
  );
  return {
    balances: data?.balances,
    isLoading,
    isError: !!error,
  };
};

export const useOpenBankingTransactions = () => {
  const fetcher = (url: string) => fetch(url).then(r => r.json());
  const {data, error, isLoading} = useSWR<OpenBankingTransactions>(
    '/api/open-banking/transactions',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateOnMount: false,
    }
  );
  return {
    transactions: data?.transactions,
    isLoading,
    isError: !!error,
  };
};
