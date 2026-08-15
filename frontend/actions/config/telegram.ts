'use server';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {withAuth} from '@/lib/grpc/auth';
import {telegramClient} from '@/lib/grpc/client';
import {GetTelegramLinkStatusResponse} from '@/lib/grpc/gen/prosper/v1/telegram';

export async function getTelegramLinkStatus(): Promise<GetTelegramLinkStatusResponse> {
  const auth = await getAuthContextOrRedirect();
  const {response} = await telegramClient.getTelegramLinkStatus(
    withAuth({}, auth)
  );
  return response;
}

export async function deleteTelegramLink(): Promise<void> {
  const auth = await getAuthContextOrRedirect();
  await telegramClient.deleteTelegramLink(withAuth({}, auth));
}
