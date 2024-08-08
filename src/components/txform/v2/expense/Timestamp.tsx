import { Input } from "@/components/forms/Input";
import { TransactionFormSchema } from "@/components/txform/v2/types";
import { useFormContext } from "react-hook-form";

export function Timestamp() {
  const {
    register,
    formState: {isSubmitting},
  } = useFormContext<TransactionFormSchema>();
  return (
    <div className="col-span-6">
      <label
        htmlFor="timestamp"
        className="block text-sm font-medium text-gray-700"
      >
        Time
      </label>
      <Input
        type="datetime-local"
        className="block w-full"
        disabled={isSubmitting}
        {...register('expense.timestamp')}
      />
    </div>
  );
}
