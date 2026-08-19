import {TextButton} from '@/components/ui/text-button';
import {Bank} from '@/lib/model/BankAccount';
import Link from 'next/link';

export function ConfigureOpenBankingConnectionLink({bank}: {bank: Bank}) {
  return (
    <TextButton asChild>
      <Link href={`/config/open-banking/mapping?bankId=${bank.id}`}>
        Configure
      </Link>
    </TextButton>
  );
}
