import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { SharingType, TransactionFormSchema } from "@/components/txform/v2/types";
import { useAllDatabaseDataContext } from "@/lib/context/AllDatabaseDataContext";
import { useDisplayBankAccounts } from "@/lib/model/AllDatabaseDataModel";
import { fullAccountName } from "@/lib/model/BankAccount";
import { useFormContext } from "react-hook-form";

export function RepaymentFields() {
  const {
    register,
    formState: {isSubmitting},
    getValues,
    watch,
  } = useFormContext<TransactionFormSchema>();
  const accounts = useDisplayBankAccounts();
  const {banks} = useAllDatabaseDataContext();
  const share = watch('expense.shareType');
  if (share != SharingType.PAID_OTHER_REPAID) {
    return <></>;
  }
  return (
    <div className="col-span-6 space-y-2 rounded border bg-accent p-2 pl-4">
      <div>
        <label
          htmlFor="timestamp"
          className="block text-sm font-medium text-gray-700"
        >
          I&apos;ve paid {getValues('expense.payer') || 'them'} on
        </label>
        <Input
          type="datetime-local"
          className="block w-full"
          disabled={isSubmitting}
          {...register('expense.repaidTimestamp')}
        />
      </div>
      <div>
        <label
          htmlFor="accountId"
          className="block text-sm font-medium text-gray-700"
        >
          I&apos;ve paid {getValues('expense.payer') || 'them'} from
        </label>
        <Select
          className="block w-full"
          disabled={isSubmitting}
          {...register('expense.repaidFromAccountId', {
            valueAsNumber: true,
          })}
        >
          {accounts.map(x => (
            <option key={x.id} value={x.id}>
              {fullAccountName(x, banks)}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
