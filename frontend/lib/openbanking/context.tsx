'use client';
import {
  AccountFetchMetadata,
  ConnectionExpiration,
  GetConnectionStatusResponse,
  GetFetchMetadataResponse,
} from '@/lib/grpc/gen/prosper/v1/openbanking';
import {createContext, useContext} from 'react';

// Open banking fetch metadata keyed by internal account id.
// Accounts that have never been fetched are absent.
type MetadataByAccount = Record<number, AccountFetchMetadata>;

const OpenBankingFetchMetadataContext = createContext<MetadataByAccount>(
  null as unknown as MetadataByAccount
);

function metadataByAccount(
  dbData: GetFetchMetadataResponse
): MetadataByAccount {
  const byAccount: MetadataByAccount = {};
  for (const account of dbData.accounts) {
    byAccount[account.internalAccountId] = account;
  }
  return byAccount;
}

export function OpenBankingFetchMetadataProvider(props: {
  dbData: GetFetchMetadataResponse;
  children: JSX.Element | JSX.Element[];
}) {
  return (
    <OpenBankingFetchMetadataContext.Provider
      value={metadataByAccount(props.dbData)}
    >
      {props.children}
    </OpenBankingFetchMetadataContext.Provider>
  );
}

export function useOpenBankingFetchMetadata() {
  const ctx = useContext(OpenBankingFetchMetadataContext);
  if (!ctx) {
    throw new Error('OpenBankingFetchMetadataContext is not configured');
  }
  return {metadataByAccount: ctx};
}

const OpenBankingConnectionStatusContext = createContext<
  ConnectionExpiration[]
>(null as unknown as ConnectionExpiration[]);

export function OpenBankingConnectionStatusContextProvider(props: {
  dbData: GetConnectionStatusResponse;
  children: JSX.Element | JSX.Element[];
}) {
  return (
    <OpenBankingConnectionStatusContext.Provider
      value={props.dbData.expirations}
    >
      {props.children}
    </OpenBankingConnectionStatusContext.Provider>
  );
}

export function useOpenBankingExpirations() {
  const ctx = useContext(OpenBankingConnectionStatusContext);
  if (!ctx) {
    throw new Error('OpenBankingConnectionStatusContext is not configured');
  }
  return {expirations: ctx};
}
