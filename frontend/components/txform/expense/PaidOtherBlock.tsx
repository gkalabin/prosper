import {Currency} from '@/components/txform/expense/Currency';
import {OwnShareAmount} from '@/components/txform/expense/OwnShareAmount';
import {Payer} from '@/components/txform/expense/Payer';
import {RepaymentFields} from '@/components/txform/expense/RepaymentFields';
import {useSharingType} from '@/components/txform/expense/useSharingType';
import {useSharingTypeActions} from '@/components/txform/expense/useSharingTypeActions';
import {usePayerName} from '@/components/txform/expense/usePayerName';
import {RevealBlock} from '@/components/txform/shared/RevealBlock';
import {TransactionFormSchema} from '@/components/txform/types';
import {Button} from '@/components/ui/button';
import {SharingType} from '@/lib/grpc/gen/prosper/v1/ledger';
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
        <Button
          type="button"
          variant="link"
          size="inherit"
          onClick={setAlreadyRepaid}
          disabled={formState.isSubmitting}
          className="text-tint-foreground mt-3 text-sm font-semibold"
        >
          <span className="font-bold">+</span> I&apos;ve already paid{' '}
          {payerName || 'them'} back
        </Button>
      )}
      <RepaymentFields transaction={transaction} />
    </RevealBlock>
  );
}
