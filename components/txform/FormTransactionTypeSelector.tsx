import classNames from "classnames";
import { FormMode } from "lib/transactionCreation";

const Button = (props: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) => {
  const { className, active, ...rest } = props;
  return (<button
    type="button"
    className={classNames(
      className,
      props.disabled ? "opacity-30" : "hover:bg-gray-100 hover:text-indigo-700 dark:hover:bg-gray-600 dark:hover:text-white",
      props.active ? "text-indigo-700" : "text-gray-900",
      "rounded-l-lg border border-gray-200 bg-white py-1 px-2 text-sm font-medium focus:z-10 focus:text-indigo-700 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:text-white",
    )}
    {...rest}
  >
    Personal
  </button>);
}

export const FormTransactionTypeSelector = (props: {
  disabled: boolean;
  children: JSX.Element | JSX.Element[];
  mode: FormMode;
  setMode: (newMode: FormMode) => void;
}) => {
  return (
    <div className="grid grid-cols-6 gap-6">
      <div className="col-span-6 flex justify-center">
        <div className="rounded-md shadow-sm">
          <Button
            className={classNames(
              "rounded-l-lg border",
            )}
            onClick={() => props.setMode(FormMode.PERSONAL)}
            active={props.mode == FormMode.PERSONAL}
            disabled={props.disabled}
          >
            Personal
          </Button>
          <Button
            className={classNames(
              "border-t border-b border-r",
            )}
            onClick={() => props.setMode(FormMode.EXTERNAL)}
            active={props.mode == FormMode.EXTERNAL}
            disabled={props.disabled}
          >
            External
          </Button>
          <Button
            className={classNames(
              "border-t border-b border-r",
            )}
            onClick={() => props.setMode(FormMode.TRANSFER)}
            active={props.mode == FormMode.TRANSFER}
            disabled={props.disabled}
          >
            Transfer
          </Button>
          <Button
            className={classNames(
              "rounded-r-md border",
            )}
            onClick={() => props.setMode(FormMode.INCOME)}
            active={props.mode == FormMode.INCOME}
            disabled={props.disabled}
          >
            Income
          </Button>
        </div>
      </div>

      {props.children}
    </div>
  );
};
