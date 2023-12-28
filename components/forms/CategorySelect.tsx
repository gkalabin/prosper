import React from "react";
import Category from "../../lib/model/Category";
import { FieldHookConfig } from "formik";
import { SelectNumber } from "./Select";
import { InputProps } from "./InputProps";

export const CategorySelect = (
  props: InputProps & FieldHookConfig<number> & { categories: Category[] }
) => {
  return (
    <SelectNumber {...props}>
      {props.categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.nameWithAncestors}
        </option>
      ))}
    </SelectNumber>
  );
};
