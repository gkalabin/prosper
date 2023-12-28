import React, { ButtonHTMLAttributes } from "react";
import { InputProps } from "./InputProps";

export const Button = (
  props: InputProps & ButtonHTMLAttributes<HTMLButtonElement>
) => {
  return (
    <button type="button" {...props}>
      {props.label}
    </button>
  );
};
