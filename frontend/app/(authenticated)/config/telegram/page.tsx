import {TelegramSettingsPage} from '@/app/(authenticated)/config/telegram/client';
import {getTelegramLinkStatus} from '@/actions/config/telegram';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Telegram Notifications - Prosper',
};

export default async function Page() {
  const status = await getTelegramLinkStatus();
  return (
    <>
      <h1 className="mb-6 text-2xl leading-7">Telegram notifications</h1>
      <TelegramSettingsPage
        configured={status.configured}
        initialLinked={status.linked}
      />
    </>
  );
}
