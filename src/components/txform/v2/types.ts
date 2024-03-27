import {incomeFormValidationSchema} from '@/components/txform/v2/income/validation';
import {z} from 'zod';

export enum FormType {
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
  INCOME = 'INCOME',
}

// TODO: move this to expense form.
export const expenseFormValidationSchema = z.object({
  timestamp: z.string(),
  amount: z.number().nonnegative(),
  ownShareAmount: z.number().nonnegative(),
  accountId: z.number().int().positive().nullable(),
  categoryId: z.number().int().positive(),
  vendor: z.string(),
  payer: z.string().nullable(),
  repaiedFromAccountId: z.number().int().positive().nullable(),
  companion: z.string().nullable(),
  tagNames: z.array(z.string()),
  description: z.string().nullable(),
  tripName: z.string().nullable(),
});
export type ExpenseFormSchema = z.infer<typeof expenseFormValidationSchema>;

export const transferFormValidationSchema = z.object({
  timestamp: z.string(),
  amountSent: z.number().nonnegative(),
  amountReceived: z.number().nonnegative(),
  fromAccountId: z.number().int().positive(),
  toAccountId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  description: z.string().nullable(),
});
export type TransferFormSchema = z.infer<typeof transferFormValidationSchema>;

export const transactionFormValidationSchema = z.object({
  formType: z.nativeEnum(FormType),
  expense: expenseFormValidationSchema.optional(),
  income: incomeFormValidationSchema.optional(),
  transfer: transferFormValidationSchema.optional(),
});

export type TransactionFormSchema = z.infer<
  typeof transactionFormValidationSchema
>;
