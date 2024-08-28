import {TrueLayerToken} from '@prisma/client';
import {AccountDetails} from '@/lib/openbanking/interface';

const ACCOUNTS_URL = 'https://api.truelayer.com/data/v1/accounts';
const CARDS_URL = 'https://api.truelayer.com/data/v1/cards';

export async function fetchAccounts(
  token: TrueLayerToken
): Promise<AccountDetails[]> {
  try {
    const acc = await fetchFromAccountsURL(token);
    return acc;
  } catch (e) {
    console.log(e);
  }
  try {
    const acc = await fetchFromCardsURL(token);
    return acc;
  } catch (e) {
    console.log(e);
  }
  return [];
}

async function fetchFromAccountsURL(
  token: TrueLayerToken
): Promise<AccountDetails[]> {
  const r = await fetch(ACCOUNTS_URL, {
    method: 'GET',
    headers: {Authorization: `Bearer ${token.access}`},
  });
  if (r.status != 200) {
    await tryLogFailure(r, `fetch accounts for ${token.id}`);
    throw new Error(`Failed to fetch accounts for ${token.id}: ${r.status}`);
  }
  const jsonResp = await r.json();
  // TODO: define the interface for the external API response.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jsonResp.results?.map((r: any) => {
    const {account_id, display_name, currency, provider} = r;
    const accountDetails: AccountDetails = {
      externalAccountId: account_id,
      name: `${display_name} ${provider?.display_name ?? ''} (${currency})`,
      providerAccountType: 'ACCOUNT',
    };
    return accountDetails;
  });
}

async function fetchFromCardsURL(
  token: TrueLayerToken
): Promise<AccountDetails[]> {
  const r = await fetch(CARDS_URL, {
    method: 'GET',
    headers: {Authorization: `Bearer ${token.access}`},
  });
  if (r.status != 200) {
    await tryLogFailure(r, `fetch accounts for ${token.id}`);
    throw new Error(`Failed to fetch accounts for ${token.id}: ${r.status}`);
  }
  const jsonResp = await r.json();
  console.log(jsonResp);
  // TODO: define the interface for the external API response.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jsonResp.results?.map((r: any) => {
    const {account_id, display_name, currency, provider} = r;
    const accountDetails: AccountDetails = {
      externalAccountId: account_id,
      name: `${display_name} ${provider?.display_name ?? ''} (${currency})`,
      providerAccountType: 'CARD',
    };
    return accountDetails;
  });
}

async function tryLogFailure(r: Response, msg: string) {
  let txt = '<Response body not available>';
  try {
    txt = await r.text();
  } catch (e) {
    console.warn(msg + ': failed to get response body', e);
  }
  console.warn(msg + `: response ${r.status} ${r.statusText}, body\n${txt}`);
}
