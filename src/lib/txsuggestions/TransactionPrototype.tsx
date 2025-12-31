import {Transaction as OpenBankingTransaction} from '@/lib/openbanking/interface';
import {z} from 'zod';

const withdrawalOrDepositFieldsSchema = z.object({
  externalTransactionId: z.string(),
  timestampEpoch: z.number().positive(),
  description: z.string(),
  originalDescription: z.string(),
  absoluteAmountCents: z.number().positive(),
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
export type WithdrawalOrDepositPrototype =
  | WithdrawalPrototype
  | DepositPrototype;
export type TransactionPrototype = z.infer<typeof transactionPrototypeSchema>;
export type TransactionPrototypeList = z.infer<
  typeof transactionPrototypeListSchema
>;

export function fromOpenBankingTransaction(
  t: OpenBankingTransaction
): WithdrawalOrDepositPrototype {
  return {
    type: t.amountCents > 0 ? ('deposit' as const) : ('withdrawal' as const),
    timestampEpoch: new Date(t.timestamp).getTime(),
    description: t.description,
    originalDescription: t.description,
    externalTransactionId: t.externalTransactionId,
    absoluteAmountCents: Math.abs(t.amountCents),
    internalAccountId: t.internalAccountId,
  };
}
