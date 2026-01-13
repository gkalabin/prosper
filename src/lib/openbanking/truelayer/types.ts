export interface TrueLayerTransaction {
  transaction_id: string;
  provider_transaction_id?: string;
  timestamp: string;
  description: string;
  amount: number;
  meta: {
    transaction_time?: string;
  };
}

export interface TrueLayerResponse {
  results: TrueLayerTransaction[];
}
