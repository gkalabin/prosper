import { SelectNumber } from "components/txform/Select";
import { FieldHookConfig } from "formik";
import { useDisplayBankAccounts } from "lib/ClientSideModel"

export const BankAccountSelect = (
  props: FieldHookConfig<number> & { label: string }
) => {
  const accounts = useDisplayBankAccounts();
  return (
    <SelectNumber {...props}>
      {accounts.map((x) => (
        <option key={x.id} value={x.id}>
          {x.bank.name} {x.name}
        </option>
      ))}
    </SelectNumber>
  );
};
