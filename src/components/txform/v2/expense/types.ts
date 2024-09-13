import {z} from 'zod';

const SharingType = z.enum([
  'PAID_SELF_NOT_SHARED',
  'PAID_SELF_SHARED',
  'PAID_OTHER_OWED',
  'PAID_OTHER_REPAID',
]);
export type SharingType = z.infer<typeof SharingType>;

export const repaymentTransactionValidationSchema = z.object({
  timestamp: z.date(),
  categoryId: z.number().int().positive(),
  accountId: z.number().int().positive(),
});
export type RepaymentTransactionFormSchema = z.infer<
  typeof repaymentTransactionValidationSchema
>;

export const expenseFormValidationSchema = z.object({
  timestamp: z.date(),
  amount: z.number().nonnegative(),
  ownShareAmount: z.number().nonnegative(),
  accountId: z.number().int().positive().nullable(),
  categoryId: z.number().int().positive(),
  vendor: z.string(),
  companion: z.string().nullable(),
  payer: z.string().nullable(),
  currency: z.string().nullable(),
  sharingType: SharingType,
  repayment: repaymentTransactionValidationSchema.nullable(),
  tagNames: z.array(z.string()),
  description: z.string().nullable(),
  tripName: z.string().nullable(),
});
export type ExpenseFormSchema = z.infer<typeof expenseFormValidationSchema>;
