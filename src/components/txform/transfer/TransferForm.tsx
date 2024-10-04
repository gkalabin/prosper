import {Account} from '@/components/txform/shared/Account';
import {Category as CategoryCommon} from '@/components/txform/shared/Category';
import {Description} from '@/components/txform/shared/Description';
import {Tags} from '@/components/txform/shared/Tags';
import {Timestamp} from '@/components/txform/shared/Timestamp';
import {Amount} from '@/components/txform/transfer/Amount';
import {AmountReceived} from '@/components/txform/transfer/AmountReceived';
import {UpdateReceivedAmountOnAmountChange} from '@/components/txform/transfer/UpdateReceivedAmountOnAmountChange';
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
