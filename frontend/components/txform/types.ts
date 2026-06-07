import {expenseFormValidationSchema} from '@/components/txform/expense/types';
import {incomeFormValidationSchema} from '@/components/txform/income/types';
import {transferFormValidationSchema} from '@/components/txform/transfer/types';
import {z} from 'zod';

const FormType = z.enum(['EXPENSE', 'TRANSFER', 'INCOME']);
export type FormType = z.infer<typeof FormType>;

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

// Field values as seen from inside a rendered form variant.
// Redefines individual subforms as nonnullable as exactly one
// form variant is populated and it is non null.
// The top level subform validates the required form type is present,
// so children components benefit from not having to deal with undefined.
export type SubFormValues = Omit<
  TransactionFormSchema,
  'expense' | 'income' | 'transfer'
> & {
  expense: NonNullable<TransactionFormSchema['expense']>;
  income: NonNullable<TransactionFormSchema['income']>;
  transfer: NonNullable<TransactionFormSchema['transfer']>;
};
