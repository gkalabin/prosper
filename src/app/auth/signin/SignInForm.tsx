'use client';
import {signIn} from '@/actions/auth/signin';
import {
  signInFormSchema,
  SignInFormSchema,
} from '@/app/auth/signin/signin-form-schema';
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
import {DEFAULT_AUTHENTICATED_PAGE} from '@/lib/auth/const';
import {waitUntilNavigationComplete} from '@/lib/auth/util';
import {zodResolver} from '@hookform/resolvers/zod';
import {useRouter} from 'next/navigation';
import {useForm} from 'react-hook-form';

export function SignInForm() {
  const form = useForm<SignInFormSchema>({
    resolver: zodResolver(signInFormSchema),
    defaultValues: {
      login: '',
      password: '',
    },
  });
  const router = useRouter();
  const onSubmit = form.handleSubmit(async (data: SignInFormSchema) => {
    try {
      const result = await signIn(data);
      if (result.success) {
        router.push(DEFAULT_AUTHENTICATED_PAGE);
        await waitUntilNavigationComplete();
        return;
      }
      form.setError('root', {message: result.error});
    } catch (e) {
      console.error('Login failed: ', e);
      form.setError('root', {message: 'Login failed, please try again.'});
    }
  });
  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
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
          control={form.control}
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

        <div role="alert" className="text-sm font-medium text-destructive">
          {form.formState.errors.root?.message}
        </div>
        <Button
          type="submit"
          className="mt-2 w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </Form>
  );
}
