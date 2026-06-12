import {z} from 'zod';

export const signupFormValidationSchema = z
  .object({
    login: z.string().min(1, {message: 'Login is required'}),
    password: z
      .string()
      .min(8, {message: 'Password must be at least 8 characters'}),
    confirmPassword: z
      .string()
      .min(1, {message: 'Confirm Password is required'}),
  })
  .refine(data => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: "Passwords don't match",
  });
export type SignUpForm = z.infer<typeof signupFormValidationSchema>;
