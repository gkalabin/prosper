import {AccountTo} from '@/components/txform/v2/income/inputs/AccountTo';
import {Amount} from '@/components/txform/v2/income/inputs/Amount';
import {Category} from '@/components/txform/v2/income/inputs/Category';
import {Companion} from '@/components/txform/v2/income/inputs/Companion';
import {ExtraFields} from '@/components/txform/v2/income/inputs/ExtraFields';
import {OwnShareAmount} from '@/components/txform/v2/income/inputs/OwnShareAmount';
import {Payer} from '@/components/txform/v2/income/inputs/Payer';
import {SplitTransactionToggle} from '@/components/txform/v2/income/inputs/SplitTransactionToggle';
import {Tags} from '@/components/txform/v2/income/inputs/Tags';
import {Timestamp} from '@/components/txform/v2/shared/Timestamp';

export function IncomeForm() {
  return (
    <>
      <Timestamp fieldName="income.timestamp" />
      <AccountTo />
      <SplitTransactionToggle />
      <Companion />
      <Amount />
      <OwnShareAmount />
      <Payer />
      <Tags />
      <Category />
      <ExtraFields />
    </>
  );
}
