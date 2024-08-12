import {z} from 'zod';

export const incomeFormValidationSchema = z
  .object({
    timestamp: z.date(),
    amount: z.number().nonnegative(),
    ownShareAmount: z.number().nonnegative(),
    accountId: z.number().int().positive(),
    categoryId: z.number().int().positive(),
    companion: z.string().nullable(),
    payer: z.string(),
    tagNames: z.array(z.string()),
    description: z.string().nullable(),
    parentTransactionId: z.number().int().positive().nullable(),
  })
  .refine(data => data.amount >= data.ownShareAmount, {
    path: ['ownShareAmount'],
    message: "Own share amount can't be greater than the total amount",
  });
export type IncomeFormSchema = z.infer<typeof incomeFormValidationSchema>;
