import {Button} from '@/components/ui/button';
import {Bank} from '@/lib/model/BankAccount';
import Link from 'next/link';

export function ConfigureOpenBankingConnectionLink({bank}: {bank: Bank}) {
  return (
    <Button variant="link" size="inherit" asChild>
      <Link href={`/config/open-banking/mapping?bankId=${bank.id}`}>
        Configure
      </Link>
    </Button>
  );
}
