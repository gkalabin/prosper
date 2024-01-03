import {AnchorLink} from 'components/ui/buttons';
import {Bank} from 'lib/model/BankAccount';

export function ConfigureOpenBankingConnectionLink({bank}: {bank: Bank}) {
  return (
    <AnchorLink href={`/config/open-banking/mapping?bankId=${bank.id}`}>
      Configure
    </AnchorLink>
  );
}
