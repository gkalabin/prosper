import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {withAuth} from '@/lib/grpc/auth';
import {openBankingClient} from '@/lib/grpc/client';
import {logApi} from '@/lib/util/log';
import {
  firstPositiveIntOrNull,
  firstValueOrNull,
} from '@/lib/util/searchParams';
import {notFound, redirect} from 'next/navigation';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{[key: string]: string | string[] | undefined}>;
}) {
  const resolvedSearchParams = await searchParams;
  const bankId = firstPositiveIntOrNull(resolvedSearchParams['bankId']);
  if (!bankId) {
    return notFound();
  }
  const institutionId = firstValueOrNull(resolvedSearchParams['institutionId']);
  if (!institutionId) {
    return notFound();
  }
  const auth = await getAuthContextOrRedirect();
  logApi('GET', '/config/open-banking/gocardless/connect', {
    userId: auth.userId,
    bankId,
    institutionId,
  });
  const {response} = await openBankingClient.startGoCardlessConnection(
    withAuth({bankId, institutionId}, auth)
  );
  redirect(response.authUrl);
}
