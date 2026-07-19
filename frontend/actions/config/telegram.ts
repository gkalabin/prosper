'use server';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {withAuth} from '@/lib/grpc/auth';
import {telegramClient} from '@/lib/grpc/client';

// TODO: remove this type and use the proto type instead.
export type TelegramLinkStatus = {
  configured: boolean;
  linked: boolean;
};

export async function getTelegramLinkStatus(): Promise<TelegramLinkStatus> {
  const auth = await getAuthContextOrRedirect();
  const {response} = await telegramClient.getTelegramLinkStatus(
    withAuth({}, auth)
  );
  return {configured: response.configured, linked: response.linked};
}

// TODO: just return proto to the client.
export async function createTelegramLink(): Promise<{deepLink: string}> {
  const auth = await getAuthContextOrRedirect();
  const {response} = await telegramClient.createTelegramLink(
    withAuth({}, auth)
  );
  return {deepLink: response.deepLink};
}

export async function deleteTelegramLink(): Promise<void> {
  const auth = await getAuthContextOrRedirect();
  await telegramClient.deleteTelegramLink(withAuth({}, auth));
}
