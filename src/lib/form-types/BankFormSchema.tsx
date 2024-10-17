import {z} from 'zod';

export const bankFormValidationSchema = z.object({
  name: z.string().min(1),
  displayOrder: z.number(),
});

export type BankFormSchema = z.infer<typeof bankFormValidationSchema>;
