import classNames from 'classnames';
import {Field, useFormikContext} from 'formik';
import {ChangeEvent} from 'react';
import {CSSObjectWithLabel} from 'react-select';

export const Select = (
  props: React.SelectHTMLAttributes<HTMLSelectElement>
) => {
  const {className, ...otherProps} = props;
  return (
    <select
      {...otherProps}
      className={classNames(
        className,
        props.disabled ? 'opacity-30' : '',
        'rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm'
      )}
    >
      {props.children}
    </select>
  );
};

export const FormikSelect = (
  props: React.SelectHTMLAttributes<HTMLSelectElement>
) => {
  const {className, id, name, disabled, ...otherProps} = props;
  const {isSubmitting} = useFormikContext();
  return (
    <Field
      {...otherProps}
      as="select"
      id={id ?? name}
      name={name}
      className={classNames(
        className,
        props.disabled ? 'opacity-30' : '',
        'rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm'
      )}
      disabled={isSubmitting || disabled}
    >
      {props.children}
    </Field>
  );
};

export const SelectNumber = (
  props: React.SelectHTMLAttributes<HTMLSelectElement> & {name: string}
) => {
  const {setFieldValue} = useFormikContext();
  return (
    <Select
      {...props}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => {
        setFieldValue(props.name, parseInt(e.target.value));
      }}
    />
  );
};

export const undoTailwindInputStyles = () => ({
  input: (baseStyles: CSSObjectWithLabel): CSSObjectWithLabel => ({
    ...baseStyles,
    input: {
      boxShadow: 'none !important',
    },
  }),
});
