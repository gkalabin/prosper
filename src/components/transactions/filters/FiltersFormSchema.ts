import {z} from 'zod';

const TransactionType = z.enum(['personal', 'external', 'transfer', 'income']);
export type TransactionType = z.infer<typeof TransactionType>;

export const filtersFormValidationSchema = z.object({
  query: z.string(),
  transactionTypes: z.array(TransactionType),
  vendor: z.string(),
  timeFrom: z.string(),
  timeTo: z.string(),
  accountIds: z.array(z.number().positive()),
  categoryIds: z.array(z.number().positive()),
  tripNames: z.array(z.string()),
  tagIds: z.array(z.number().positive()),
  allTagsShouldMatch: z.boolean(),
});
export type FiltersFormSchema = z.infer<typeof filtersFormValidationSchema>;
