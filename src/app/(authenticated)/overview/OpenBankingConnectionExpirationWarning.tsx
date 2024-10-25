'use client';
import {Button} from '@/components/ui/button';
import {Bank} from '@/lib/model/BankAccount';
import {useOpenBankingExpirations} from '@/lib/openbanking/context';
import {differenceInDays} from 'date-fns';
import Link from 'next/link';

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
  const expiresInDays = differenceInDays(expiration.expirationEpoch, now);
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
      <Button variant="link" size="inherit" asChild>
        <Link href={`/api/open-banking/reconnect?bankId=${bank.id}`}>
          Reconnect
        </Link>
      </Button>
    </div>
  );
}
