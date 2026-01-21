'use client';
import {signUp} from '@/actions/auth/signup';
import {
  signupFormValidationSchema,
  type SignUpForm as SignUpFormValues,
} from '@/app/auth/signup/signup-form-schema';
import {Button} from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {POST_SIGNUP_PAGE} from '@/lib/auth/const';
import {waitUntilNavigationComplete} from '@/lib/auth/util';
import {zodResolver} from '@hookform/resolvers/zod';
import {useRouter} from 'next/navigation';
import {type SubmitHandler, useForm} from 'react-hook-form';

export function SignUpForm() {
  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signupFormValidationSchema),
    defaultValues: {
      login: '',
      password: '',
      confirmPassword: '',
    },
  });
  const {
    handleSubmit,
    formState: {isSubmitting, errors},
    setError,
    control,
  } = form;
  const router = useRouter();
  const onSubmit: SubmitHandler<SignUpFormValues> = async data => {
    try {
      const response = await signUp(data);
      if (response.success) {
        router.push(POST_SIGNUP_PAGE);
        await waitUntilNavigationComplete();
        return;
      }
      setError('root', {message: response.error});
    } catch (e) {
      console.error('Sign up failed: ', e);
      setError('root', {message: 'Registration failed, please try again.'});
    }
  };
  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          <div role="alert" className="text-sm font-medium text-destructive">
            {errors.root.message}
          </div>
        )}
        <div>
          <Button
            type="submit"
            className="mt-6 block w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
