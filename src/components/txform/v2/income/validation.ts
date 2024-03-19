import { z } from 'zod';

export const incomeFormValidationSchema = z
  .object({
    timestamp: z.string().datetime(),
    amount: z.number().nonnegative(),
    ownShareAmount: z
      .number()
      .nonnegative(),
    accountId: z.number().int().positive(),
    categoryId: z.number().int().positive(),
    companion: z.string().optional(),
    payer: z.string(),
    tagNames: z.array(z.string()),
    description: z.string().optional(),
    parentTransactionId: z.number().int().positive().optional(),
  })
  .refine(data => data.amount >= data.ownShareAmount, {
    path: ['ownShareAmount'],
    message: "Own share amount can't be greater than the total amount",
  });
export type IncomeFormSchema = z.infer<typeof incomeFormValidationSchema>;
