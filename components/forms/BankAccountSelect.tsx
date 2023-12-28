import { InputProps } from "components/forms/InputProps";
import { SelectNumber } from "components/forms/Select";
import { FieldHookConfig } from "formik";
import { Bank } from "lib/model/BankAccount";

export const BankAccountSelect = (
  props: InputProps & FieldHookConfig<number> & { banks: Bank[] }
) => {
  return (
    <SelectNumber {...props}>
      {props.banks.map((b) =>
        b.accounts.map((ba) => (
          <option key={ba.id} value={ba.id}>
            {b.name} {ba.name}
          </option>
        ))
      )}
    </SelectNumber>
  );
};
