import classNames from "classnames";
import { InputProps } from "components/forms/InputProps";
import { Field, FieldHookConfig, useField } from "formik";
import { ClassAttributes } from "react";

export const MoneyInputWithLabel = (
  props: InputProps & FieldHookConfig<number>
) => {
  return (
    <InputWithLabelUntyped
      {...props}
      type="number"
      step="0.01"
      inputMode="decimal"
      onFocus={(e) => e.target.select()}
    />
  );
};

export const TextInputWithLabel = (
  props: InputProps & FieldHookConfig<string>
) => {
  return <InputWithLabelUntyped {...props} type="text" />;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const InputWithLabelUntyped = (props: InputProps & FieldHookConfig<any>) => {
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
      <Input
        id={props.name}
        {...field}
        {...inputAttributes}
        className="block w-full"
      />
    </>
  );
};

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => {
  const { className, ...otherProps } = props;
  return (
    <input
      {...otherProps}
      className={classNames(
        className,
        props.disabled ? "opacity-30" : "",
        "rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      )}
    />
  );
};

export const FormikInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => {
  const { className, type, id, name, ...otherProps } = props;
  return (
    <Field
      {...otherProps}
      id={id ?? name}
      name={name}
      type={type ?? "text"}
      className={classNames(
        className,
        props.disabled ? "opacity-30" : "",
        "rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      )}
    />
  );
};
