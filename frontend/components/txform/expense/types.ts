import {findByCode} from '@/lib/model/Currency';
import {isValid} from 'date-fns';
import {z} from 'zod';

const SharingType = z.enum([
  'PAID_SELF_NOT_SHARED',
  'PAID_SELF_SHARED',
  'PAID_OTHER_OWED',
  'PAID_OTHER_REPAID',
]);
export type SharingType = z.infer<typeof SharingType>;

export const repaymentTransactionValidationSchema = z
  .object({
    timestamp: z.date().or(z.string()),
    categoryId: z.number().int().positive(),
    accountId: z.number().int().positive(),
  })
  .refine(data => isValid(data.timestamp), {
    message: 'Invalid date',
    path: ['timestamp'],
  });
export type RepaymentTransactionFormSchema = z.infer<
  typeof repaymentTransactionValidationSchema
>;

export const expenseFormValidationSchema = z
  .object({
    timestamp: z.date().or(z.string()),
    // Coerce all the amounts. We cannot use default form inputs as some locales use comma as a decimal separator,
    // to account for that, we update the field value on change (see MoneyInput). This onChange handler calls react hook
    // form's onChange with a string value which gets coerced here. The alternative is to parse valid numbers in the onChange,
    // but it is difficult because of edge cases.
    // For example, while the user types 4.06 the value is 4.0 at some point which gets converted to 4.
    amount: z.coerce.number().nonnegative(),
    ownShareAmount: z.coerce.number().nonnegative(),
    accountId: z.number().int().positive().nullable(),
    categoryId: z.number().int().positive(),
    vendor: z.string().trim().min(1, 'Vendor is required'),
    companion: z.string().nullable(),
    payer: z.string().nullable(),
    currency: z.string().nullable(),
    sharingType: SharingType,
    repayment: repaymentTransactionValidationSchema.nullable(),
    tagNames: z.array(z.string()),
    description: z.string().nullable(),
    tripName: z.string().nullable(),
  })
  .superRefine((data, ctx) => {
    if (!isValid(data.timestamp)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['timestamp'],
        message: 'Invalid date',
      });
    }
    if (data.ownShareAmount > data.amount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ownShareAmount'],
        message: "Own share amount can't be greater than the total amount",
      });
    }
    const paidSelf =
      data.sharingType === 'PAID_SELF_NOT_SHARED' ||
      data.sharingType === 'PAID_SELF_SHARED';
    if (paidSelf && data.accountId === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accountId'],
        message: 'Account is required',
      });
    }
    if (data.sharingType === 'PAID_SELF_SHARED' && !data.companion?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['companion'],
        message: 'Companion is required for a shared expense',
      });
    }
    const paidOther =
      data.sharingType === 'PAID_OTHER_OWED' ||
      data.sharingType === 'PAID_OTHER_REPAID';
    if (paidOther && !data.payer?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['payer'],
        message: 'Payer is required when someone else paid',
      });
    }
    if (paidOther && !data.currency?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['currency'],
        message: 'Currency is required when someone else paid',
      });
    }
    if (paidOther && data.currency && !findByCode(data.currency)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['currency'],
        message: `Unsupported currency: ${data.currency}`,
      });
    }
    if (data.sharingType === 'PAID_OTHER_REPAID' && !data.repayment) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['repayment'],
        message: 'Repayment details are required',
      });
    }
  });
export type ExpenseFormSchema = z.infer<typeof expenseFormValidationSchema>;
