export interface AccountBalance {
  internalAccountId: number;
  balanceCents: number;
}

export interface ConnectionExpiration {
  bankId: number;
  expirationEpoch: number;
}

export interface Transaction {
  externalTransactionId: string;
  timestampEpoch: number;
  description: string;
  amountCents: number;
  internalAccountId: number;
}

export interface AccountDetails {
  externalAccountId: string;
  name: string;
}
