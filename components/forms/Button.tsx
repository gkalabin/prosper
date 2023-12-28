import { InputProps } from "components/forms/InputProps";
import { ButtonHTMLAttributes } from "react";

export const Button = (
  props: InputProps & ButtonHTMLAttributes<HTMLButtonElement>
) => {
  const className = "rounded-md bg-indigo-600 px-4 py-1.5 text-base font-medium leading-7 text-white shadow-sm ring-1 ring-indigo-600 hover:bg-indigo-700 hover:ring-indigo-700"
  return (
    <button type="button" {...props}>
      {props.label || props.children}
    </button>
  );
};
