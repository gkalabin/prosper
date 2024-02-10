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
  timestamp: Date;
  description: string;
  amountCents: number;
  internalAccountId: number;
}

export interface AccountDetails {
  externalAccountId: string;
  name: string;
}
