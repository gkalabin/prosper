import {z} from 'zod';

export const signupFormValidationSchema = z
  .object({
    login: z.string().min(1, {message: 'Login is required'}),
    password: z.string().min(1, {message: 'Password is required'}),
    confirmPassword: z
      .string()
      .min(1, {message: 'Confirm Password is required'}),
  })
  .refine(data => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: "Passwords don't match",
  });
export type SignUpForm = z.infer<typeof signupFormValidationSchema>;

export const signupErrorSchema = z.object({
  success: z.literal(false),
  name: z.union([z.literal('root'), z.literal('login')]),
  message: z.string(),
});
export type SignUpError = z.infer<typeof signupErrorSchema>;

export const signupResponseSchema = z.union([
  signupErrorSchema,
  z.object({
    success: z.literal(true),
  }),
]);
export type SignUpResponse = z.infer<typeof signupResponseSchema>;
