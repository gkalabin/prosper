import {incomeFormValidationSchema} from '@/components/txform/v2/income/validation';
import {z} from 'zod';

const FormType = z.enum(['EXPENSE', 'TRANSFER', 'INCOME']);
export type FormType = z.infer<typeof FormType>;

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

// TODO: move this to expense form.
export const expenseFormValidationSchema = z.object({
  timestamp: z.date(),
  amount: z.number().nonnegative(),
  ownShareAmount: z.number().nonnegative(),
  accountId: z.number().int().positive().nullable(),
  categoryId: z.number().int().positive(),
  vendor: z.string(),
  companion: z.string().nullable(),
  payer: z.string().nullable(),
  sharingType: SharingType,
  repayment: repaymentTransactionValidationSchema.nullable(),
  tagNames: z.array(z.string()),
  description: z.string().nullable(),
  tripName: z.string().nullable(),
});
export type ExpenseFormSchema = z.infer<typeof expenseFormValidationSchema>;

export const transferFormValidationSchema = z.object({
  timestamp: z.date(),
  amountSent: z.number().nonnegative(),
  amountReceived: z.number().nonnegative(),
  fromAccountId: z.number().int().positive(),
  toAccountId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  description: z.string().nullable(),
});
export type TransferFormSchema = z.infer<typeof transferFormValidationSchema>;

export const transactionFormValidationSchema = z
  .object({
    formType: FormType,
    expense: expenseFormValidationSchema.optional(),
    income: incomeFormValidationSchema.optional(),
    transfer: transferFormValidationSchema.optional(),
  })
  .refine(data => {
    const formType = data.formType;
    if (formType === FormType.enum.EXPENSE) {
      return !!data.expense;
    }
    if (formType === FormType.enum.INCOME) {
      return !!data.income;
    }
    if (formType === FormType.enum.TRANSFER) {
      return !!data.transfer;
    }
    return false;
  });

export type TransactionFormSchema = z.infer<
  typeof transactionFormValidationSchema
>;
