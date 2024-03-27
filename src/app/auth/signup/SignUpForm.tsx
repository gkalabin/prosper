'use client';
import {Input} from '@/components/forms/Input';
import {ButtonPagePrimary} from '@/components/ui/buttons';
import {
  signupFormValidationSchema,
  signupResponseSchema,
  type SignUpForm as SignUpFormValues,
} from '@/lib/model/signup-form';
import {zodResolver} from '@hookform/resolvers/zod';
import classNames from 'classnames';
import {signIn} from 'next-auth/react';
import {useState} from 'react';
import {SubmitHandler, useForm} from 'react-hook-form';

const genericError = 'Registration failed, please try again.';

export function SignUpForm() {
  const [inProgress, setInProgress] = useState(false);
  const {
    register,
    handleSubmit,
    formState: {errors},
    setError,
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signupFormValidationSchema),
  });
  const onSubmit: SubmitHandler<SignUpFormValues> = async data => {
    setInProgress(true);
    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const json = await response.json();
      const parsed = signupResponseSchema.safeParse(json);
      if (!parsed.success) {
        setInProgress(false);
        setError('root', {message: genericError});
        return;
      }
      if (!parsed.data.success) {
        setInProgress(false);
        setError(parsed.data.name, {message: parsed.data.message});
        return;
      }
      await signIn('credentials', {
        login: data.login,
        password: data.password,
        redirect: true,
        callbackUrl: '/config/banks',
      });
    } catch (e) {
      setInProgress(false);
      setError('root', {message: genericError});
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
          className={classNames(
            'block w-full',
            errors.login && 'border-red-500'
          )}
          disabled={inProgress}
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
          className={classNames(
            'block w-full',
            errors.password && 'border-red-500'
          )}
          disabled={inProgress}
          {...register('password')}
        />
        {errors.password && (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {errors.password.message}
          </p>
        )}
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
          className={classNames(
            'block w-full',
            errors.confirmPassword && 'border-red-500'
          )}
          disabled={inProgress}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>
      {errors.root && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {errors.root.message}
        </p>
      )}
      <ButtonPagePrimary
        type="submit"
        className="mt-6 w-full"
        disabled={inProgress}
      >
        {inProgress ? 'Creating account...' : 'Create account'}
      </ButtonPagePrimary>
    </form>
  );
}
