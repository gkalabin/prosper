export type TransferPrototype = {
  type: "transfer";
  withdrawal: WithdrawalPrototype;
  deposit: DepositPrototype;
};

export interface WithdrawalPrototype extends WithdrawalOrDepositFields {
  type: "withdrawal";
};

export interface DepositPrototype extends WithdrawalOrDepositFields {
  type: "deposit";
};

interface WithdrawalOrDepositFields {
  externalTransactionId: string;
  timestampEpoch: number;
  description: string;
  originalDescription: string;
  absoluteAmountCents: number;
  internalAccountId: number;
};

export type WithdrawalOrDepositPrototype = WithdrawalPrototype | DepositPrototype;

export type TransactionPrototype = WithdrawalPrototype | DepositPrototype | TransferPrototype;
