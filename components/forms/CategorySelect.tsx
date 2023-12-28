import { InputProps } from "components/forms/InputProps";
import { SelectNumber } from "components/forms/Select";
import { FieldHookConfig } from "formik";
import { Category } from "lib/model/Category";

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
