import {useSharingType} from '@/components/txform/expense/useSharingType';
import {useSharingTypeActions} from '@/components/txform/expense/useSharingTypeActions';
import {TransactionFormSchema} from '@/components/txform/types';
import {Label} from '@/components/ui/label';
import {Switch} from '@/components/ui/switch';
import {SharingType} from '@/lib/grpc/gen/prosper/v1/ledger';
import {useFormContext, useWatch} from 'react-hook-form';

export function RepaymentToggle() {
  const {formState} = useFormContext<TransactionFormSchema>();
  const {sharingType, paidOther} = useSharingType();
  const {setAlreadyRepaid, setOweMoney} = useSharingTypeActions();
  const payer = useWatch({name: 'expense.payer', exact: true}) || 'them';
  if (!paidOther) {
    return null;
  }
  const repaid = sharingType == SharingType.PAID_OTHER_REPAID;
  return (
    <Label className="col-span-6 flex w-fit cursor-pointer flex-row items-center gap-2.5">
      <Switch
        className="data-[state=checked]:bg-brand"
        checked={repaid}
        disabled={formState.isSubmitting}
        onCheckedChange={checked =>
          checked ? setAlreadyRepaid() : setOweMoney()
        }
      />
      <span className="text-[13px] font-semibold">
        I&apos;ve already repaid {payer}
      </span>
    </Label>
  );
}
