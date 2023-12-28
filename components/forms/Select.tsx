import classNames from "classnames";
import { Field, useFormikContext } from "formik";

export const Select = (
  props: React.SelectHTMLAttributes<HTMLSelectElement>
) => {
  const { className, ...otherProps } = props;
  return (
    <select
      {...otherProps}
      className={classNames(
        className,
        props.disabled ? "opacity-30" : "",
        "rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
      )}
    >
      {props.children}
    </select>
  );
};

export const FormikSelect = (
  props: React.SelectHTMLAttributes<HTMLSelectElement>
) => {
  const { className, id, name, ...otherProps } = props;
  return (
    <Field
      {...otherProps}
      as="select"
      id={id ?? name}
      name={name}
      className={classNames(
        className,
        props.disabled ? "opacity-30" : "",
        "rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
      )}
    >
      {props.children}
    </Field>
  );
};

export const SelectNumber = (
  props: React.SelectHTMLAttributes<HTMLSelectElement>
) => {
  const { setFieldValue } = useFormikContext();
  return (
    <Select
      {...props}
      onChange={(e: { target: { value: string } }) => {
        setFieldValue(props.name, parseInt(e.target.value));
      }}
    />
  );
};

export const undoTailwindInputStyles = () => ({
  input: (baseStyles) => ({
    ...baseStyles,
    input: {
      boxShadow: "none !important",
    },
  }),
});
