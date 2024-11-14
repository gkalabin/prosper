import {authOptions} from '@/app/api/auth/[...nextauth]/authOptions';
import {LOGIN_PAGE} from '@/lib/const';
import {getServerSession} from 'next-auth';
import {redirect} from 'next/navigation';

export async function getUserIdOrRedirect(): Promise<number> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return redirect(LOGIN_PAGE);
  }
  return userId;
}
