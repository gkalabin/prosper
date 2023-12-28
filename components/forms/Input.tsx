import classNames from "classnames";
import { InputProps } from "components/forms/InputProps";
import { Field, FieldHookConfig, useField, useFormikContext } from "formik";
import { ClassAttributes } from "react";

export const MoneyInputWithLabel = (
  props: InputProps & FieldHookConfig<number>
) => {
  const { setFieldValue } = useFormikContext();
  return (
    <InputWithLabelUntyped
      {...props}
      type="text"
      step="0.01"
      inputMode="decimal"
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        // When locale set to NL for the example, the decimal separator is a comma.
        // TODO: try using making AddTransactionFormValues a class with a method providing number value for the text.
        setFieldValue(props.name, e.target.value.replace(/,/g, "."));
      }}
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
  const { disabled, ...otherProps } = props;
  const [field] = useField(props);
  const label = props.label;
  const inputAttributes = otherProps as ClassAttributes<HTMLInputElement>;
  const { isSubmitting } = useFormikContext();
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
        disabled={isSubmitting || disabled}
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
        "rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
      )}
    />
  );
};

export const FormikInput = (
  props: React.InputHTMLAttributes<HTMLInputElement>
) => {
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
        "rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
      )}
    />
  );
};
