'use client';
import {TextButton} from '@/components/ui/text-button';
import {Bank} from '@/lib/model/BankAccount';

export function ReconnectOpenBankingLink({bank}: {bank: Bank}) {
  return (
    <TextButton tone="accent" asChild>
      <a href={`/config/open-banking/reconnect?bankId=${bank.id}`}>Reconnect</a>
    </TextButton>
  );
}
