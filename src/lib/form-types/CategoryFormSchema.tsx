import {z} from 'zod';

export const categoryFormValidationSchema = z.object({
  name: z.string().min(1),
  displayOrder: z.number(),
  parentCategoryId: z.number().positive().optional(),
});

export type CategoryFormSchema = z.infer<typeof categoryFormValidationSchema>;
