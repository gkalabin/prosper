import React from "react";
import Currency from "../../lib/model/Currency";
import { FieldHookConfig } from "formik";
import { SelectNumber } from "./Select";
import { InputProps } from "./InputProps";

export const CurrencySelect = (
  props: InputProps & FieldHookConfig<number> & { currencies: Currency[] }
) => {
  return (
    <SelectNumber {...props}>
      {props.currencies.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </SelectNumber>
  );
};

export default CurrencySelect;
