import {Currency} from '@/components/txform/expense/Currency';
import {OwnShareAmount} from '@/components/txform/expense/OwnShareAmount';
import {Payer} from '@/components/txform/expense/Payer';
import {RepaymentFields} from '@/components/txform/expense/RepaymentFields';
import {useSharingType} from '@/components/txform/expense/useSharingType';
import {useSharingTypeActions} from '@/components/txform/expense/useSharingTypeActions';
import {RevealBlock} from '@/components/txform/shared/RevealBlock';
import {TransactionFormSchema} from '@/components/txform/types';
import {SharingType} from '@/lib/grpc/gen/prosper/v1/ledger';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {useFormContext} from 'react-hook-form';

// PaidOtherBlock is the "someone else paid" reveal: no account of mine is
// debited, so it takes a payer, a currency, and my share (what I owe). The
// repayment detail is one level deeper still, behind a quiet link.
export function PaidOtherBlock({
  transaction,
}: {
  transaction: Transaction | null;
}) {
  const {sharingType, paidOther} = useSharingType();
  const {removeShare, setAlreadyRepaid} = useSharingTypeActions();
  const {getValues, formState} = useFormContext<TransactionFormSchema>();
  if (!paidOther) {
    return null;
  }
  const payerName = getValues('expense.payer')?.trim() || 'Someone';
  const payerFirstName = payerName.split(' ')[0];
  return (
    <RevealBlock
      heading={`${payerName} paid`}
      onRemove={removeShare}
      disabled={formState.isSubmitting}
    >
      <div className="grid grid-cols-[1.4fr_1fr] gap-3">
        <Payer />
        <Currency />
      </div>
      <div className="mt-3">
        <OwnShareAmount />
      </div>
      {sharingType === SharingType.PAID_OTHER_OWED && (
        <button
          type="button"
          onClick={setAlreadyRepaid}
          disabled={formState.isSubmitting}
          className="text-tint-foreground mt-3 text-sm font-semibold disabled:opacity-50"
        >
          <span className="font-bold">+</span> I&apos;ve already paid{' '}
          {payerFirstName} back
        </button>
      )}
      <RepaymentFields transaction={transaction} />
    </RevealBlock>
  );
}
