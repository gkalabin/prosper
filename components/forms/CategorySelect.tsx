import { FieldHookConfig } from "formik";
import { Category } from "../../lib/model/Category";
import { InputProps } from "./InputProps";
import { SelectNumber } from "./Select";

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
