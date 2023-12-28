export type IOpenBankingData = {
  openBankingData: {
    balances: { [bankAccountId: string]: number };
    transactions: IOBTransactionsByAccountId;
  };
};

// OBTransaction represents an open banking transaction from True Layer API.
export interface IOBTransaction {
  amount: number;
  currency: string;
  description: string;
  transaction_id: string;
  provider_transaction_id: string;
  normalised_provider_transaction_id: string;
  merchant_name: string;
  running_balance: { currency: string; amount: number };
  meta: {
    provider_category: string;
    transaction_type: string;
    provider_id: string;
    provider_merchant_name: string;
    counter_party_preferred_name: string;
    user_comments: string;
  };
  timestamp: string;
  transaction_type: string;
  transaction_category: string;
  transaction_classification: Array<string>;
  settled: boolean;
}

export interface IOBTransactionsByAccountId {
  [bankAccountId: string]: IOBTransaction[];
}
