import classNames from "classnames";
import { InputProps } from "components/forms/InputProps";
import { FieldHookConfig, useField, useFormikContext } from "formik";
import { ClassAttributes } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SelectWithLabelUntyped = (props: InputProps & FieldHookConfig<any>) => {
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
      <Select {...field} {...inputProps} className="mt-1 block w-full" />
    </>
  );
};

export const SelectString = (props: InputProps & FieldHookConfig<string>) => {
  return <SelectWithLabelUntyped {...props} />;
};

export const SelectNumber = (props: InputProps & FieldHookConfig<number>) => {
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

export const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => {
  const { className, ...otherProps } = props;
  return (
    <select
      {...otherProps}
      className={classNames(
        className,
        props.disabled ? "opacity-30" : "",
        "rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
      )}
    >
      {props.children}
    </select>
  );
};
