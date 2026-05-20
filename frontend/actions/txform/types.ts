import {TransactionFormSchema} from '@/components/txform/types';
import {type typeToFlattenedError} from 'zod';

export type UpsertTransactionClientError = {
  status: 'CLIENT_ERROR';
  errors: typeToFlattenedError<TransactionFormSchema>;
};

export type UpsertTransactionSuccess = {
  status: 'SUCCESS';
};

export type UpsertTransactionAPIResponse =
  | UpsertTransactionClientError
  | UpsertTransactionSuccess;
