import {isValid} from 'date-fns';
import {z} from 'zod';

export const transferFormValidationSchema = z
  .object({
    timestamp: z.date().or(z.string()),
    // Coerce all the amounts. We cannot use default form inputs as some locales use comma as a decimal separator,
    // to account for that, we update the field value on change (see MoneyInput). This onChange handler calls react hook
    // form's onChange with a string value which gets coerced here. The alternative is to parse valid numbers in the onChange,
    // but it is difficult because of edge cases.
    // For example, while the user types 4.06 the value is 4.0 at some point which gets converted to 4.
    amountSent: z.coerce.number().positive('Amount must be greater than zero'),
    amountReceived: z.coerce
      .number()
      .positive('Amount must be greater than zero'),
    fromAccountId: z.number().int().positive(),
    toAccountId: z.number().int().positive(),
    categoryId: z.number().int().positive(),
    description: z.string().nullable(),
    tagNames: z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    if (!isValid(data.timestamp)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['timestamp'],
        message: 'Invalid date',
      });
    }
    if (data.fromAccountId === data.toAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['toAccountId'],
        message: 'Source and destination accounts must differ',
      });
    }
  });
export type TransferFormSchema = z.infer<typeof transferFormValidationSchema>;
