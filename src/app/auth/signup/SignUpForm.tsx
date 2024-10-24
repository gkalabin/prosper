'use client';
import {Button} from '@/components/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {
  signupFormValidationSchema,
  signupResponseSchema,
  type SignUpForm as SignUpFormValues,
} from '@/lib/model/signup-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {signIn} from 'next-auth/react';
import {useState} from 'react';
import {SubmitHandler, useForm} from 'react-hook-form';

const genericError = 'Registration failed, please try again.';

export function SignUpForm() {
  const [inProgress, setInProgress] = useState(false);
  const {
    handleSubmit,
    formState: {errors},
    setError,
    control,
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
    <form onSubmit={handleSubmit(onSubmit)} className="gap-y-4">
      <FormField
        control={control}
        name="login"
        render={({field}) => (
          <FormItem>
            <FormLabel>Login</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="password"
        render={({field}) => (
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl>
              <Input type="password" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="confirmPassword"
        render={({field}) => (
          <FormItem>
            <FormLabel>Confirm Password</FormLabel>
            <FormControl>
              <Input type="password" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {errors.root && (
        <div className="text-sm font-medium text-destructive">
          {errors.root.message}
        </div>
      )}
      <Button type="submit" className="mt-6 w-full" disabled={inProgress}>
        {inProgress ? 'Creating account...' : 'Create account'}
      </Button>
    </form>
  );
}
