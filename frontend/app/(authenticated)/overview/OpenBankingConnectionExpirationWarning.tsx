'use client';
import {TextButton} from '@/components/ui/text-button';
import {timestampToEpoch} from '@/lib/grpc/timestamp';
import {Bank} from '@/lib/model/BankAccount';
import {useOpenBankingExpirations} from '@/lib/openbanking/context';
import {differenceInDays} from 'date-fns';

export function OpenBankingConnectionExpirationWarning({bank}: {bank: Bank}) {
  const {expirations} = useOpenBankingExpirations();
  if (!expirations?.length) {
    return <></>;
  }
  const expiration = expirations.find(e => e.bankId == bank.id);
  if (!expiration) {
    return <></>;
  }
  const now = new Date();
  const expiresInDays = differenceInDays(
    timestampToEpoch(expiration.expiresAt),
    now
  );
  if (expiresInDays > 7) {
    return <></>;
  }
  const dayOrDays = Math.abs(expiresInDays) == 1 ? 'day' : 'days';
  let text = `OpenBanking connection expires in ${expiresInDays} ${dayOrDays}.`;
  if (Math.abs(expiresInDays) < 1) {
    text = `OpenBanking connection has expired today.`;
  } else if (expiresInDays < 0) {
    text = `OpenBanking connection has expired ${-expiresInDays} ${dayOrDays} ago.`;
  }
  return (
    <div className="text-sm font-light text-gray-700">
      {text}{' '}
      <TextButton tone="accent" asChild>
        <a href={`/config/open-banking/reconnect?bankId=${bank.id}`}>
          Reconnect
        </a>
      </TextButton>
    </div>
  );
}
