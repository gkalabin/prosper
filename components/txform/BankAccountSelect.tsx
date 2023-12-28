import { SelectNumber } from "components/txform/Select";
import { FieldHookConfig } from "formik";
import { useAllDatabaseDataContext, useDisplayBankAccounts } from "lib/ClientSideModel";
import { fullAccountName } from "lib/model/BankAccount";

export const BankAccountSelect = (
  props: FieldHookConfig<number> & { label: string }
) => {
  const accounts = useDisplayBankAccounts();
  const {banks} = useAllDatabaseDataContext();
  return (
    <SelectNumber {...props}>
      {accounts.map((x) => (
        <option key={x.id} value={x.id}>
          {fullAccountName(x, banks)}
        </option>
      ))}
    </SelectNumber>
  );
};
