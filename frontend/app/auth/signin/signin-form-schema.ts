import {z} from 'zod';

export const signInFormSchema = z.object({
  login: z.string().min(1).max(256),
  password: z.string().min(1).max(256),
});

export type SignInFormSchema = z.infer<typeof signInFormSchema>;
