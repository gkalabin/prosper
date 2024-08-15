import {AccountFrom} from '@/components/txform/v2/expense/inputs/AccountFrom';
import {Amount} from '@/components/txform/v2/expense/inputs/Amount';
import {Category} from '@/components/txform/v2/expense/inputs/Category';
import {Companion} from '@/components/txform/v2/expense/inputs/Companion';
import {ExtraFields} from '@/components/txform/v2/expense/inputs/ExtraFields';
import {OwnShareAmount} from '@/components/txform/v2/expense/inputs/OwnShareAmount';
import {Payer} from '@/components/txform/v2/expense/inputs/Payer';
import {RepaymentFields} from '@/components/txform/v2/expense/inputs/RepaymentFields';
import {SplitTransactionToggle} from '@/components/txform/v2/expense/inputs/SplitTransactionToggle';
import {Tags} from '@/components/txform/v2/expense/inputs/Tags';
import {Timestamp} from '@/components/txform/v2/expense/inputs/Timestamp';
import {Vendor} from '@/components/txform/v2/expense/inputs/Vendor';

export function ExpenseForm() {
  return (
    <>
      <Timestamp fieldName="expense.timestamp" />
      <AccountFrom />
      <Payer />
      <SplitTransactionToggle />
      <Companion />
      <Amount />
      <OwnShareAmount />
      <RepaymentFields />
      <Vendor />
      <Tags />
      <Category />
      <ExtraFields />
    </>
  );
}
