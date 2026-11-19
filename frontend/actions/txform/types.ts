import {TransactionFormSchema} from '@/components/txform/types';
import {OriginKind} from '@/lib/grpc/gen/prosper/v1/ledger';
import {z} from 'zod';

export const originSchema = z.object({
  kind: z.nativeEnum(OriginKind),
  key: z.string().min(1),
});

export type UpsertTransactionClientError = {
  status: 'CLIENT_ERROR';
  errors: z.core.$ZodFlattenedError<TransactionFormSchema>;
};

export type UpsertTransactionSuccess = {
  status: 'SUCCESS';
};

export type UpsertTransactionAPIResponse =
  UpsertTransactionClientError | UpsertTransactionSuccess;
