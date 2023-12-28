export enum FormMode {
  PERSONAL,
  EXTERNAL,
  TRANSFER,
  INCOME,
}

export type TransactionFormValues = {
  mode: FormMode;
  timestamp: string;
  description: string;
  amount: number;
  ownShareAmount: number;
  categoryId: number;
  vendor: string;
  otherPartyName: string;
  fromBankAccountId: number;
  toBankAccountId: number;
  payer: string;
  currencyCode: string;
  receivedAmount: number;
  isShared: boolean;
  tripName: string;
  tagNames: string[];
  parentTransactionId: number;
};
