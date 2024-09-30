import {Account} from '@/components/txform/v2/shared/Account';
import {Tags} from '@/components/txform/v2/shared/Tags';
import {Timestamp} from '@/components/txform/v2/shared/Timestamp';
import {Amount} from '@/components/txform/v2/transfer/inputs/Amount';
import {AmountReceived} from '@/components/txform/v2/transfer/inputs/AmountReceived';
import {Category} from '@/components/txform/v2/transfer/inputs/Category';
import {Description} from '@/components/txform/v2/transfer/inputs/Description';

export function TransferForm() {
  return (
    <>
      <Timestamp fieldName="transfer.timestamp" />
      <Account fieldName="transfer.fromAccountId" label="Money sent from" />
      <Account fieldName="transfer.toAccountId" label="Money received to" />
      <Amount />
      <AmountReceived />
      <Description />
      <Tags fieldName="transfer.tagNames" />
      <Category />
    </>
  );
}
