import {useSharingType} from '@/components/txform/expense/useSharingType';
import {useSharingTypeActions} from '@/components/txform/expense/useSharingTypeActions';
import {AddOnButton} from '@/components/txform/shared/AddOnButton';
import {TransactionFormSchema} from '@/components/txform/types';
import {SharingType} from '@/lib/grpc/gen/prosper/v1/ledger';
import {ArrowUpTrayIcon, UsersIcon} from '@heroicons/react/24/outline';
import {useFormContext} from 'react-hook-form';

// SharingControls are the two quiet add-ons offered at rest: most expenses are
// just me paying for myself, so sharing costs a single calm line here. Tapping
// one reveals its compact block anchored right below.
export function SharingControls() {
  const {sharingType} = useSharingType();
  const {openSplit, setPaidOther} = useSharingTypeActions();
  const {
    formState: {isSubmitting},
  } = useFormContext<TransactionFormSchema>();
  if (sharingType !== SharingType.PAID_SELF_NOT_SHARED) {
    return null;
  }
  return (
    <div className="flex gap-2">
      <AddOnButton
        onClick={openSplit}
        disabled={isSubmitting}
        icon={<UsersIcon className="h-4 w-4" />}
      >
        Split with someone
      </AddOnButton>
      <AddOnButton
        onClick={setPaidOther}
        disabled={isSubmitting}
        icon={<ArrowUpTrayIcon className="h-4 w-4" />}
      >
        Someone else paid
      </AddOnButton>
    </div>
  );
}
