import {useSharingType} from '@/components/txform/expense/useSharingType';
import {useSharingTypeActions} from '@/components/txform/expense/useSharingTypeActions';
import {TransactionFormSchema} from '@/components/txform/types';
import {useFormContext} from 'react-hook-form';

// Switches the expense between being paid from an own account and being paid
// by someone else.
export function PayerModeToggle() {
  const {formState} = useFormContext<TransactionFormSchema>();
  const {paidOther} = useSharingType();
  const {setPaidSelf, setPaidOther} = useSharingTypeActions();
  return (
    <button
      type="button"
      onClick={paidOther ? setPaidSelf : setPaidOther}
      disabled={formState.isSubmitting}
      className="text-brand-ink decoration-border hover:decoration-brand text-[13px] font-semibold underline underline-offset-4 disabled:opacity-50"
    >
      {paidOther ? 'I paid for this myself' : 'Someone else paid'}
    </button>
  );
}
