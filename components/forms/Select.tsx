import classNames from "classnames";

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
        "rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
      )}
    >
      {props.children}
    </select>
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
