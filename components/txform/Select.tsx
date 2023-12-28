import { Select } from "components/forms/Select";
import { FieldHookConfig, useField, useFormikContext } from "formik";
import { ClassAttributes } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SelectWithLabelUntyped = (props: FieldHookConfig<any> & { label: string }) => {
  const [field] = useField(props);
  const label =
    props.label || props.name.charAt(0).toUpperCase() + props.name.slice(1);
  const inputProps = props as ClassAttributes<HTMLSelectElement>;
  return (
    <>
      <label
        htmlFor={props.id || props.name}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <Select {...field} {...inputProps} className="block w-full" />
    </>
  );
};

export const SelectNumber = (props: FieldHookConfig<number> & { label: string }) => {
  const { setFieldValue } = useFormikContext();
  return (
    <SelectWithLabelUntyped
      {...props}
      onChange={(e: { target: { value: string } }) => {
        setFieldValue(props.name, parseInt(e.target.value));
      }}
    />
  );
};