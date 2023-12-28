import React, { ClassAttributes } from "react";
import { useField, FieldHookConfig } from "formik";
import { InputProps } from "./InputProps";

export const MoneyInput = (props: InputProps & FieldHookConfig<number>) => {
  return <InputUntyped {...props} type="number" step="0.01" inputMode="decimal" />;
};

export const TextInput = (props: InputProps & FieldHookConfig<string>) => {
  return <InputUntyped {...props} />;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const InputUntyped = (props: InputProps & FieldHookConfig<any>) => {
  const [field] = useField(props);
  const label = props.label || props.name.charAt(0).toUpperCase() + props.name.slice(1);
  const inputAttributes = props as ClassAttributes<HTMLInputElement>;
  return (
    <>
      <label
        htmlFor={props.id || props.name}
        className="block text-gray-700 text-sm font-bold mb-2"
      >
        {label}
      </label>
      <input
        {...field}
        {...inputAttributes}
        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
    </>
  );
};
