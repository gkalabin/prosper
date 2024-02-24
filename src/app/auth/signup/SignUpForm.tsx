'use client';
import {Input} from '@/components/forms/Input';
import {ButtonPagePrimary} from '@/components/ui/buttons';
import {signIn} from 'next-auth/react';
import {FormEvent, useState} from 'react';
import {SubmitHandler, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';

const validationSchema = z
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

type ValidationSchema = z.infer<typeof validationSchema>;

export function SignUpForm() {
  const [credentials, setCredentials] = useState<{
    login: string;
    password: string;
  }>({login: '', password: ''});
  const [inProgress, setInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: {errors},
  } = useForm<ValidationSchema>({
    resolver: zodResolver(validationSchema),
  });

  const onSubmit: SubmitHandler<ValidationSchema> = async data => {
    setInProgress(true);
    try {
      // TODO: add error handling.
      await fetch('/api/signup', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      await signIn('credentials', {
        login: credentials.login,
        password: credentials.password,
        redirect: true,
        callbackUrl: '/overview',
      });
    } catch (e) {
      setError(`Registration failed: ${e}`);
    }
  };
  return (
    <form
      method="post"
      action="/api/auth/signup"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div>
        <label
          htmlFor="login"
          className="block text-sm font-medium text-gray-700"
        >
          Login
        </label>
        <Input
          type="text"
          id="login"
          className="block w-full"
          {...register('login')}
        />
        {errors.login && (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {errors.login.message}
          </p>
        )}
      </div>
      <div className="mt-4">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <Input
          type="password"
          className="block w-full"
          {...register('password')}
        />
      </div>
      <div className="mt-4">
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-gray-700"
        >
          Confirm Password
        </label>
        <Input
          type="password"
          className="block w-full"
          {...register('confirmPassword')}
        />
      </div>
      <ButtonPagePrimary type="submit" className="mt-6 w-full">
        Create account
      </ButtonPagePrimary>
    </form>
  );
}
