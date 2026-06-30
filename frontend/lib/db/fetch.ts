import {assertDefined} from '@/lib/assert';
import {AuthContext} from '@/lib/auth/user';
import {withAuth} from '@/lib/grpc/auth';
import {
  DisplaySettings,
  GetCoreDataResponse,
  GetTransactionsResponse,
} from '@/lib/grpc/gen/prosper/v1/ledger';
import {
  GetConnectionStatusResponse,
  GetFetchMetadataResponse,
} from '@/lib/grpc/gen/prosper/v1/openbanking';
import {GetMarketDataForUserResponse} from '@/lib/grpc/gen/prosper/v1/rates';
import {ledgerClient, openBankingClient, ratesClient} from '@/lib/grpc/client';

// CoreData refines the proto response so callers can rely on
// displaySettings being present — fetchCoreData asserts it before
// returning, so a missing row fails fast instead of leaking into every
// page that reads it.
export type CoreData = Omit<GetCoreDataResponse, 'displaySettings'> & {
  displaySettings: DisplaySettings;
};

export async function fetchTransactionData(
  auth: AuthContext
): Promise<GetTransactionsResponse> {
  const {response} = await ledgerClient.getTransactions(withAuth({}, auth));
  return response;
}

export async function fetchCoreData(auth: AuthContext): Promise<CoreData> {
  const {response} = await ledgerClient.getCoreData(withAuth({}, auth));
  assertDefined(
    response.displaySettings,
    `display settings missing for user ${auth.userId}`
  );
  return response as CoreData;
}

export async function fetchMarketData(
  auth: AuthContext
): Promise<GetMarketDataForUserResponse> {
  const {response} = await ratesClient.getMarketDataForUser(withAuth({}, auth));
  return response;
}

export async function fetchOpenBankingMetadata(
  auth: AuthContext
): Promise<GetFetchMetadataResponse> {
  const {response} = await openBankingClient.getFetchMetadata(
    withAuth({}, auth)
  );
  return response;
}

export async function fetchOpenBankingConnectionStatus(
  auth: AuthContext
): Promise<GetConnectionStatusResponse> {
  const {response} = await openBankingClient.getConnectionStatus(
    withAuth({}, auth)
  );
  return response;
}
