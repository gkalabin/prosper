import React, { ClassAttributes, ReactEventHandler } from "react";
import { useField, FieldHookConfig } from "formik";
import { InputProps } from "./InputProps";
import { useFormikContext } from "formik";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SelectUntyped = (props: InputProps & FieldHookConfig<any>) => {
  const [field] = useField(props);
  const label =
    props.label || props.name.charAt(0).toUpperCase() + props.name.slice(1);
  const inputProps = props as ClassAttributes<HTMLSelectElement>;
  return (
    <>
      <label
        htmlFor={props.id || props.name}
        className="block text-gray-700 text-sm font-bold mb-2"
      >
        {label}
      </label>
      <select
        {...field}
        {...inputProps}
        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      />
    </>
  );
};

export const SelectString = (props: InputProps & FieldHookConfig<string>) => {
  return <SelectUntyped {...props} />;
};

export const SelectNumber = (props: InputProps & FieldHookConfig<number>) => {
  const { setFieldValue } = useFormikContext();
  return (
    <SelectUntyped
      {...props}
      onChange={(e: { target: { value: string; }; }) => {
        setFieldValue(props.name, parseInt(e.target.value));
      }}
    />
  );
};
