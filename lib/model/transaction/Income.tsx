import { TransactionCompanion } from "./Transaction";


export type Income = {
  kind: "Income";
  id: number;
  timestampEpoch: number;
  payer: string;
  amountCents: number;
  companions: TransactionCompanion[];
  note: string;
  accountId: number;
  categoryId: number;
  tagsIds: number[];
  tripId?: number;
  refundGroupTransactionIds: number[];
};
