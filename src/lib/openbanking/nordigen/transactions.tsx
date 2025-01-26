import {Transaction} from '@/lib/openbanking/interface';
import {ExternalAccountMapping, NordigenToken} from '@prisma/client';

export function fetchTransactions(
  token: NordigenToken,
  mapping: ExternalAccountMapping
): Promise<Transaction[]> {
  const init = {
    method: 'GET',
    headers: {Authorization: `Bearer ${token.access}`},
  };
  const url = `https://bankaccountdata.gocardless.com/api/v2/accounts/${mapping.externalAccountId}/transactions/`;
  return fetch(url, init)
    .then(r => r.json())
    .then(x => decode({response: x, accountId: mapping.internalAccountId}));
}

// TODO: define the interface for the external API response.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decode(arg: {accountId: number; response: any}): Transaction[] {
  const {transactions} = arg.response;
  if (!transactions) {
    console.warn('Nordigen transactions error', arg.response);
    return [];
  }
  const {booked, pending} = transactions;
  if (!booked?.length && !pending?.length) {
    console.warn('Nordigen transactions error', arg.response);
    return [];
  }
  return [...(booked ?? []), ...(pending ?? [])].map(t => {
    const {
      transactionAmount,
      transactionId,
      internalTransactionId,
      valueDateTime,
      creditorName,
      remittanceInformationUnstructuredArray,
    } = t;
    const amountCents = Math.round(transactionAmount.amount * 100);
    const description =
      creditorName ?? remittanceInformationUnstructuredArray?.[0] ?? '';
    return {
      timestamp: new Date(valueDateTime),
      description: description,
      externalTransactionId: transactionId ?? internalTransactionId,
      amountCents: amountCents,
      internalAccountId: arg.accountId,
    };
  });
}
