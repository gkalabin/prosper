import {isValid} from 'date-fns';
import {z} from 'zod';

export const incomeFormValidationSchema = z
  .object({
    timestamp: z.date().or(z.string()),
    // Coerce all the amounts. We cannot use default form inputs as some locales use comma as a decimal separator,
    // to account for that, we update the field value on change (see MoneyInput). This onChange handler calls react hook
    // form's onChange with a string value which gets coerced here. The alternative is to parse valid numbers in the onChange,
    // but it is difficult because of edge cases.
    // For example, while the user types 4.06 the value is 4.0 at some point which gets converted to 4.
    amount: z.coerce.number().nonnegative(),
    ownShareAmount: z.coerce.number().nonnegative(),
    accountId: z.number().int().positive(),
    categoryId: z.number().int().positive(),
    isShared: z.boolean(),
    companion: z.string().nullable(),
    payer: z.string(),
    tagNames: z.array(z.string()),
    description: z.string().nullable(),
    parentTransactionId: z.number().int().positive().nullable(),
  })
  .refine(data => data.amount >= data.ownShareAmount, {
    path: ['ownShareAmount'],
    message: "Own share amount can't be greater than the total amount",
  })
  .refine(data => isValid(data.timestamp), {
    message: 'Invalid date',
    path: ['timestamp'],
  });
export type IncomeFormSchema = z.infer<typeof incomeFormValidationSchema>;
