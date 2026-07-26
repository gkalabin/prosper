'use client';
import {Button} from '@/components/ui/button';
import {Bank} from '@/lib/model/BankAccount';

export function ReconnectOpenBankingLink({bank}: {bank: Bank}) {
  return (
    <Button variant="link" size="inherit" asChild>
      <a href={`/api/open-banking/reconnect?bankId=${bank.id}`}>Reconnect</a>
    </Button>
  );
}
