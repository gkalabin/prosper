import {Account} from '@/components/txform/shared/Account';
import {Category as CategoryCommon} from '@/components/txform/shared/Category';
import {Description} from '@/components/txform/shared/Description';
import {NewBalanceNote} from '@/components/txform/shared/NewBalanceNote';
import {Tags} from '@/components/txform/shared/Tags';
import {Timestamp} from '@/components/txform/shared/Timestamp';
import {Amount} from '@/components/txform/transfer/Amount';
import {AmountReceived} from '@/components/txform/transfer/AmountReceived';
import {UpdateReceivedAmountOnAmountChange} from '@/components/txform/transfer/UpdateReceivedAmountOnAmountChange';
import {isTransfer, Transaction} from '@/lib/model/transaction/Transaction';
import {useWatch} from 'react-hook-form';

export function TransferForm({transaction}: {transaction: Transaction | null}) {
  return (
    <>
      <Timestamp fieldName="transfer.timestamp" />
      <Account fieldName="transfer.fromAccountId" label="Money sent from" />
      <Account fieldName="transfer.toAccountId" label="Money received to" />
      <Amount />
      <AmountReceived />
      <NewBalancesNote transaction={transaction} />
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

function NewBalancesNote({transaction}: {transaction: Transaction | null}) {
  return (
    <>
      <div className="col-span-6 -my-1 text-xs font-medium">New Balances</div>
      <div className="col-span-3">
        <NewBalanceFrom transaction={transaction} />
      </div>
      <div className="col-span-3">
        <NewBalanceTo transaction={transaction} />
      </div>
    </>
  );
}

function NewBalanceFrom({transaction}: {transaction: Transaction | null}) {
  const amount = useWatch({name: 'transfer.amountSent', exact: true});
  const accountId = useWatch({name: 'transfer.fromAccountId', exact: true});
  return (
    <NewBalanceNote
      text="From:"
      amount={-amount}
      accountId={accountId}
      transaction={transaction}
    />
  );
}

function NewBalanceTo({transaction}: {transaction: Transaction | null}) {
  const amount = useWatch({name: 'transfer.amountReceived', exact: true});
  const accountId = useWatch({name: 'transfer.toAccountId', exact: true});
  return (
    <NewBalanceNote
      text="To:"
      amount={amount}
      accountId={accountId}
      transaction={transaction}
    />
  );
}
