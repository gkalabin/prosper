import {Account} from '@/components/txform/v2/shared/Account';
import {Category as CategoryCommon} from '@/components/txform/v2/shared/Category';
import {Description} from '@/components/txform/v2/shared/Description';
import {Tags} from '@/components/txform/v2/shared/Tags';
import {Timestamp} from '@/components/txform/v2/shared/Timestamp';
import {Amount} from '@/components/txform/v2/transfer/inputs/Amount';
import {AmountReceived} from '@/components/txform/v2/transfer/inputs/AmountReceived';
import {UpdateReceivedAmountOnAmountChange} from '@/components/txform/v2/transfer/inputs/UpdateReceivedAmountOnAmountChange';
import {isTransfer} from '@/lib/model/transaction/Transaction';

export function TransferForm() {
  return (
    <>
      <Timestamp fieldName="transfer.timestamp" />
      <Account fieldName="transfer.fromAccountId" label="Money sent from" />
      <Account fieldName="transfer.toAccountId" label="Money received to" />
      <Amount />
      <AmountReceived />
      <Description fieldName="transfer.description" />
      <Tags fieldName="transfer.tagNames" />
      <Category />

      <UpdateReceivedAmountOnAmountChange />
    </>
  );
}

function Category() {
  return (
    <CategoryCommon fieldName="transfer.categoryId" filters={[isTransfer]} />
  );
}
