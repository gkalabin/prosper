import {OpenBankingTransaction} from '@/lib/grpc/gen/prosper/v1/openbanking';
import {timestampToEpoch} from '@/lib/grpc/timestamp';
import {z} from 'zod';

const withdrawalOrDepositFieldsSchema = z.object({
  externalTransactionId: z.string(),
  timestampEpoch: z.number().positive(),
  description: z.string(),
  originalDescription: z.string(),
  // Nanos as a plain number because prototypes cross a JSON boundary
  // where bigint cannot be serialized.
  absoluteAmountNanos: z.number().positive(),
  internalAccountId: z.number().positive(),
});

const withdrawalPrototypeSchema = withdrawalOrDepositFieldsSchema.extend({
  type: z.literal('withdrawal'),
});

const depositPrototypeSchema = withdrawalOrDepositFieldsSchema.extend({
  type: z.literal('deposit'),
});

const transferPrototypeSchema = z.object({
  type: z.literal('transfer'),
  withdrawal: withdrawalPrototypeSchema,
  deposit: depositPrototypeSchema,
});

const withdrawalOrDepositPrototypeSchema = z.union([
  withdrawalPrototypeSchema,
  depositPrototypeSchema,
]);

const transactionPrototypeSchema = z.union([
  withdrawalPrototypeSchema,
  depositPrototypeSchema,
  transferPrototypeSchema,
]);

export const transactionPrototypeListSchema = z.array(
  transactionPrototypeSchema
);

export type TransferPrototype = z.infer<typeof transferPrototypeSchema>;
export type WithdrawalPrototype = z.infer<typeof withdrawalPrototypeSchema>;
export type DepositPrototype = z.infer<typeof depositPrototypeSchema>;
export type WithdrawalOrDepositPrototype = z.infer<
  typeof withdrawalOrDepositPrototypeSchema
>;
export type TransactionPrototype = z.infer<typeof transactionPrototypeSchema>;
export type TransactionPrototypeList = z.infer<
  typeof transactionPrototypeListSchema
>;

export function fromOpenBankingTransaction(
  t: OpenBankingTransaction,
  internalAccountId: number
): WithdrawalOrDepositPrototype {
  const amountNanos = Number(t.signedAmountNanos);
  return {
    type: amountNanos > 0 ? ('deposit' as const) : ('withdrawal' as const),
    timestampEpoch: timestampToEpoch(t.timestamp),
    description: t.description,
    originalDescription: t.description,
    externalTransactionId: t.externalTransactionId,
    absoluteAmountNanos: Math.abs(amountNanos),
    internalAccountId,
  };
}
