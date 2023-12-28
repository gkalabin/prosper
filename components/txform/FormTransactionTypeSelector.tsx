import classNames from "classnames";
import { useFormikContext } from "formik";
import { AddTransactionFormValues, FormMode } from "lib/transactionDbUtils";

const Button = (
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }
) => {
  const { className, active, ...rest } = props;
  return (
    <button
      type="button"
      className={classNames(
        className,
        props.disabled
          ? "opacity-30"
          : "hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-gray-600 dark:focus:bg-gray-600",
        props.active
          ? "text-indigo-700 dark:text-indigo-200"
          : "text-gray-900 dark:text-white",
        "border border-gray-200 bg-white py-1 px-2 text-sm font-medium focus:z-10 dark:border-gray-600 dark:bg-gray-700"
      )}
      {...rest}
    >
      {props.children}
    </button>
  );
};

export const FormTransactionTypeSelector = (props: { disabled: boolean }) => {
  const {
    values: { mode },
    setFieldValue,
  } = useFormikContext<AddTransactionFormValues>();
  return (
    <div className="col-span-6 flex justify-center">
      <div className="rounded-md shadow-sm">
        <Button
          className={classNames("rounded-l-lg border")}
          onClick={() => setFieldValue("mode", FormMode.PERSONAL)}
          active={mode == FormMode.PERSONAL}
          disabled={props.disabled}
        >
          Personal
        </Button>
        <Button
          className={classNames("border-t border-b border-r")}
          onClick={() => setFieldValue("mode", FormMode.EXTERNAL)}
          active={mode == FormMode.EXTERNAL}
          disabled={props.disabled}
        >
          External
        </Button>
        <Button
          className={classNames("border-t border-b border-r")}
          onClick={() => setFieldValue("mode", FormMode.TRANSFER)}
          active={mode == FormMode.TRANSFER}
          disabled={props.disabled}
        >
          Transfer
        </Button>
        <Button
          className={classNames("rounded-r-md border")}
          onClick={() => setFieldValue("mode", FormMode.INCOME)}
          active={mode == FormMode.INCOME}
          disabled={props.disabled}
        >
          Income
        </Button>
      </div>
    </div>
  );
};
