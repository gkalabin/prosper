import { FieldHookConfig } from "formik";
import { Bank } from "lib/model/BankAccount";
import { InputProps } from "./InputProps";
import { SelectNumber } from "./Select";

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
