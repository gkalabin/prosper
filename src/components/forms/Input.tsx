import classNames from 'classnames';
import {forwardRef} from 'react';

export interface LabelledInputProps {
  label: string;
  name: string;
}

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>((props, ref) => {
  const {className, ...otherProps} = props;
  return (
    <input
      ref={ref}
      {...otherProps}
      className={classNames(
        className,
        props.disabled ? 'opacity-30' : '',
        'rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm'
      )}
    />
  );
});
Input.displayName = 'Input';
