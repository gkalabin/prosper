export interface StarlingAmount {
  minorUnits: number;
  currency?: string;
}

export interface StarlingAccount {
  accountUid: string;
  defaultCategory: string;
  currency: string;
  name: string;
  [key: string]: unknown;
}

export interface StarlingAccountsResponse {
  accounts: StarlingAccount[];
}

export interface StarlingBalanceResponse {
  effectiveBalance: StarlingAmount;
  [key: string]: unknown;
}

export interface StarlingFeedItem {
  feedItemUid: string;
  categoryUid?: string;
  amount: StarlingAmount;
  direction: 'IN' | 'OUT' | string;
  transactionTime: string;
  counterPartyName: string;
  reference?: string;
  [key: string]: unknown;
}

export interface StarlingFeedResponse {
  feedItems: StarlingFeedItem[];
}
