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

export const expenseFormValidationSchema = z
  .object({
    timestamp: z.date(),
    // Coerce all the amounts. We cannot use default form inputs as some locales use comma as a decimal separator,
    // to account for that, we update the field value on change (see MoneyInput). This onChange handler calls react hook
    // form's onChange with a string value which gets coerced here. The alternative is to parse valid numbers in the onChange,
    // but it is difficult because of edge cases.
    // For example, while the user types 4.06 the value is 4.0 at some point which gets converted to 4.
    amount: z.coerce.number().nonnegative(),
    ownShareAmount: z.coerce.number().nonnegative(),
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
  })
  .refine(
    data => {
      if (data.sharingType === 'PAID_OTHER_REPAID') {
        return !!data.repayment;
      }
      return true;
    },
    {
      message: 'Repayment data is missing',
    }
  )
  .refine(
    data => {
      if (
        data.sharingType === 'PAID_SELF_NOT_SHARED' ||
        data.sharingType === 'PAID_SELF_SHARED'
      ) {
        // When paid self, the account should be specified.
        return data.accountId !== null;
      }
      return true;
    },
    {
      message: 'Account is required',
      path: ['accountId'],
    }
  );
export type ExpenseFormSchema = z.infer<typeof expenseFormValidationSchema>;
