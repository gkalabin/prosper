import {z} from 'zod';

export const transferFormValidationSchema = z.object({
  timestamp: z.date(),
  amountSent: z.number().nonnegative(),
  amountReceived: z.number().nonnegative(),
  fromAccountId: z.number().int().positive(),
  toAccountId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  description: z.string().nullable(),
  tagNames: z.array(z.string()),
});
export type TransferFormSchema = z.infer<typeof transferFormValidationSchema>;
