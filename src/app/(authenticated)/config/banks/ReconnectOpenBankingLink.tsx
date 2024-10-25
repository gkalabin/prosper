'use client';
import {Button} from '@/components/ui/button';
import {Bank} from '@/lib/model/BankAccount';
import Link from 'next/link';

export function ReconnectOpenBankingLink({bank}: {bank: Bank}) {
  return (
    <Button variant="link" size="inherit" asChild>
      <Link href={`/api/open-banking/reconnect?bankId=${bank.id}`}>
        Reconnect
      </Link>
    </Button>
  );
}
