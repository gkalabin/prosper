import { InputProps } from "components/forms/InputProps";
import { FieldHookConfig, useField } from "formik";
import { ClassAttributes } from "react";

export const MoneyInput = (props: InputProps & FieldHookConfig<number>) => {
  return (
    <InputUntyped {...props} type="number" step="0.01" inputMode="decimal" onFocus={(e) => e.target.select()} />
  );
};

export const TextInput = (props: InputProps & FieldHookConfig<string>) => {
  return <InputUntyped {...props} type="text" />;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const InputUntyped = (props: InputProps & FieldHookConfig<any>) => {
  const [field] = useField(props);
  const label =
    props.label || props.name.charAt(0).toUpperCase() + props.name.slice(1);
  const inputAttributes = props as ClassAttributes<HTMLInputElement>;
  return (
    <>
      <label
        htmlFor={props.name}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <input
        id={props.name}
        {...field}
        {...inputAttributes}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      />
    </>
  );
};
