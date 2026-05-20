import {
  AuthServiceClient,
  LedgerServiceClient,
} from '@/lib/grpc/gen/prosper/v1/ledger.client';
import {OpenBankingServiceClient} from '@/lib/grpc/gen/prosper/v1/openbanking.client';
import {RatesServiceClient} from '@/lib/grpc/gen/prosper/v1/rates.client';
import {ChannelCredentials} from '@grpc/grpc-js';
import {GrpcTransport} from '@protobuf-ts/grpc-transport';

const SOCKET_PATH = process.env.GRPC_SOCKET_PATH || '/tmp/prosper.sock';

// @grpc/grpc-js supports unix sockets via the `unix:` scheme.
const transport = new GrpcTransport({
  host: `unix:${SOCKET_PATH}`,
  channelCredentials: ChannelCredentials.createInsecure(),
});

export const ratesClient = new RatesServiceClient(transport);
export const openBankingClient = new OpenBankingServiceClient(transport);
export const ledgerClient = new LedgerServiceClient(transport);
export const authClient = new AuthServiceClient(transport);
