import classNames from "classnames";
import { Field, useField, useFormikContext } from "formik";
import { ChangeEvent, FocusEvent } from "react";

export interface LabelledInputProps {
  label: string;
  name: string;
}

export const MoneyInputWithLabel = (
  props: LabelledInputProps & React.InputHTMLAttributes<HTMLInputElement>,
) => {
  return (
    <>
      <label
        htmlFor={props.name}
        className="block text-sm font-medium text-gray-700"
      >
        {props.label}
      </label>
      <FormikMoneyInput {...props} className="block w-full" />
    </>
  );
};

export const TextInputWithLabel = (
  props: LabelledInputProps & React.InputHTMLAttributes<HTMLInputElement>,
) => {
  return <InputWithLabelUntyped {...props} type="text" />;
};

export const InputWithLabel = (
  props: LabelledInputProps & React.InputHTMLAttributes<HTMLInputElement>,
) => {
  const { type, ...otherProps } = props;
  return <InputWithLabelUntyped {...otherProps} type={type ?? "text"} />;
};

const InputWithLabelUntyped = (
  props: LabelledInputProps & React.InputHTMLAttributes<HTMLInputElement>,
) => {
  const { disabled, ...otherProps } = props;
  const [field] = useField(props);
  const label = props.label;
  const { isSubmitting } = useFormikContext();
  return (
    <>
      <label
        htmlFor={props.name}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <FormikInput
        id={props.name}
        {...field}
        {...otherProps}
        onFocus={(e) => e.target.select()}
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
        "rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm",
      )}
    />
  );
};

export const FormikInput = (
  props: React.InputHTMLAttributes<HTMLInputElement>,
) => {
  const { className, type, id, name, disabled, ...otherProps } = props;
  const { isSubmitting } = useFormikContext();
  return (
    <Field
      {...otherProps}
      id={id ?? name}
      name={name}
      type={type ?? "text"}
      disabled={isSubmitting || disabled}
      onFocus={(e: FocusEvent<HTMLInputElement>) => e.target.select()}
      className={classNames(
        className,
        props.disabled ? "opacity-30" : "",
        "rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm",
      )}
    />
  );
};

export const FormikMoneyInput = (
  props: React.InputHTMLAttributes<HTMLInputElement> & { name: string },
) => {
  const { disabled, ...otherProps } = props;
  const { setFieldValue, isSubmitting } = useFormikContext();
  return (
    <FormikInput
      {...otherProps}
      type="text"
      step="0.01"
      inputMode="decimal"
      onFocus={(e) => e.target.select()}
      disabled={isSubmitting || disabled}
      onChange={(e: ChangeEvent<HTMLInputElement>) => {
        // When locale set to NL for the example, the decimal separator is a comma.
        // TODO: try using making AddTransactionFormValues a class with a method providing number value for the text.
        setFieldValue(props.name, e.target.value.replace(/,/g, "."));
      }}
    />
  );
};
