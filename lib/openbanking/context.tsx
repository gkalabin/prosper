import { OpenBankingBalances } from "pages/api/open-banking/balances";
import { OpenBankingTransactions } from "pages/api/open-banking/transactions";
import useSWR from "swr";

export const useOpenBankingExpirations = () => {
  const fetcher = (url) => fetch(url).then((r) => r.json());
  const { data, error, isLoading } = useSWR<OpenBankingBalances>(
    "/api/open-banking/balances",
    fetcher
  );
  return {
    expirations: data?.expirtations,
    isLoading,
    isError: !!error,
  };
};

export const useOpenBankingBalances = () => {
  const fetcher = (url) => fetch(url).then((r) => r.json());
  const { data, error, isLoading } = useSWR<OpenBankingBalances>(
    "/api/open-banking/balances",
    fetcher
  );
  return {
    balances: data?.balances,
    isLoading,
    isError: !!error,
  };
};

export const useOpenBankingTransactions = () => {
  const fetcher = (url) => fetch(url).then((r) => r.json());
  const { data, error, isLoading } = useSWR<OpenBankingTransactions>(
    "/api/open-banking/transactions",
    fetcher
  );
  return {
    transactions: data?.transactions,
    isLoading,
    isError: !!error,
  };
};
