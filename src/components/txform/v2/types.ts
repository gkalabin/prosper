import {expenseFormValidationSchema} from '@/components/txform/v2/expense/types';
import {incomeFormValidationSchema} from '@/components/txform/v2/income/types';
import {transferFormValidationSchema} from '@/components/txform/v2/transfer/types';
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
