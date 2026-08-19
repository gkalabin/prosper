import {Currency} from '@/components/txform/expense/Currency';
import {OwnShareAmount} from '@/components/txform/expense/OwnShareAmount';
import {Payer} from '@/components/txform/expense/Payer';
import {RepaymentFields} from '@/components/txform/expense/RepaymentFields';
import {useSharingType} from '@/components/txform/expense/useSharingType';
import {useSharingTypeActions} from '@/components/txform/expense/useSharingTypeActions';
import {usePayerName} from '@/components/txform/expense/usePayerName';
import {RevealBlock} from '@/components/txform/shared/RevealBlock';
import {TransactionFormSchema} from '@/components/txform/types';
import {TextButton} from '@/components/ui/text-button';
import {SharingType} from '@/lib/grpc/gen/prosper/v1/ledger';
import {PlusIcon} from '@heroicons/react/24/outline';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {useFormContext} from 'react-hook-form';

export function PaidOtherBlock({
  transaction,
}: {
  transaction: Transaction | null;
}) {
  const {sharingType} = useSharingType();
  const {setPaidSelf, setAlreadyRepaid} = useSharingTypeActions();
  const {formState} = useFormContext<TransactionFormSchema>();
  const payerName = usePayerName();
  return (
    <RevealBlock
      heading={`${payerName || 'Someone'} paid`}
      onRemove={setPaidSelf}
      disabled={formState.isSubmitting}
    >
      <div className="grid grid-cols-2 gap-3">
        <Payer />
        <Currency />
      </div>
      <div className="mt-3">
        <OwnShareAmount />
      </div>
      {sharingType === SharingType.PAID_OTHER_OWED && (
        <TextButton
          type="button"
          tone="accent"
          className="mt-3 text-sm"
          onClick={setAlreadyRepaid}
          disabled={formState.isSubmitting}
        >
          <PlusIcon />
          I&apos;ve already paid {payerName || 'them'} back
        </TextButton>
      )}
      <RepaymentFields transaction={transaction} />
    </RevealBlock>
  );
}
