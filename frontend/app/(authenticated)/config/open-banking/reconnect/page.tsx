import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {withAuth} from '@/lib/grpc/auth';
import {openBankingClient} from '@/lib/grpc/client';
import {logApi} from '@/lib/util/log';
import {firstPositiveIntOrNull} from '@/lib/util/searchParams';
import {notFound, redirect} from 'next/navigation';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{[key: string]: string | string[] | undefined}>;
}) {
  const bankId = firstPositiveIntOrNull((await searchParams)['bankId']);
  if (!bankId) {
    return notFound();
  }
  const auth = await getAuthContextOrRedirect();
  logApi('GET', '/config/open-banking/reconnect', {
    userId: auth.userId,
    bankId,
  });
  const {response} = await openBankingClient.reconnectInfo(
    withAuth({bankId}, auth)
  );
  redirect(response.redirectUrl);
}
