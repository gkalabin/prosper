'use client';
import {AnchorLink} from 'components/ui/buttons';
import {Bank} from 'lib/model/BankAccount';

export function ReconnectOpenBankingLink({bank}: {bank: Bank}) {
  return (
    <AnchorLink href={`/api/open-banking/reconnect?bankId=${bank.id}`}>
      Reconnect
    </AnchorLink>
  );
}
