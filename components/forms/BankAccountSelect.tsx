import React from "react";
import Bank from "../../lib/model/Bank";
import { FieldHookConfig } from "formik";
import { SelectNumber } from "./Select";
import { InputProps } from "./InputProps";

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
