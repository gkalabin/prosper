import { InputProps } from "components/forms/InputProps";
import { SelectNumber } from "components/forms/Select";
import { FieldHookConfig } from "formik";
import { Bank } from "lib/model/BankAccount";

export const BankAccountSelect = (
  props: InputProps & FieldHookConfig<number> & { banks: Bank[] }
) => {
  const accounts = props.banks
    .flatMap((x) => x.accounts)
    .filter((x) => !x.isArchived());
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
