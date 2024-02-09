import {LabelledInputProps} from '@/components/forms/Input';
import {Select} from '@/components/forms/Select';
import {useField, useFormikContext} from 'formik';
import {capitalize} from '@/lib/util/util';

const SelectWithLabelUntyped = (
  props: React.InputHTMLAttributes<HTMLSelectElement> & LabelledInputProps
) => {
  const [field] = useField(props);
  const label = props.label || capitalize(props.name);
  return (
    <>
      <label
        htmlFor={props.id || props.name}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <Select {...field} {...props} className="block w-full" />
    </>
  );
};

export const SelectNumber = (
  props: React.InputHTMLAttributes<HTMLSelectElement> & LabelledInputProps
) => {
  const {setFieldValue} = useFormikContext();
  return (
    <SelectWithLabelUntyped
      {...props}
      onChange={(e: {target: {value: string}}) => {
        setFieldValue(props.name, parseInt(e.target.value));
      }}
    />
  );
};
