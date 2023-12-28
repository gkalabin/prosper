import classNames from "classnames";
import { FormMode } from "lib/AddTransactionDataModels";

export const FormTransactionTypeSelector = (props: {
  disabled: boolean;
  children: JSX.Element | JSX.Element[];
  mode: FormMode;
  setMode: (newMode: FormMode) => void;
}) => {
  const modeSelectorTextColor = (targetMode: FormMode) => {
    const className = {
      "text-indigo-700": props.mode == targetMode,
      "text-gray-900": props.mode != targetMode,
    };
    return className;
  };

  return (
    <div className="grid grid-cols-6 gap-6">
      <div className="col-span-6 flex justify-center">
        <div className="rounded-md shadow-sm">
          <button
            type="button"
            className={classNames(
              "rounded-l-lg border border-gray-200 bg-white py-1 px-2 text-sm font-medium hover:bg-gray-100 hover:text-indigo-700 focus:z-10 focus:text-indigo-700 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:hover:text-white dark:focus:text-white",
              modeSelectorTextColor(FormMode.PERSONAL)
            )}
            onClick={() => props.setMode(FormMode.PERSONAL)}
            disabled={props.disabled}
          >
            Personal
          </button>
          <button
            type="button"
            className={classNames(
              "border-t border-b border-r border-gray-200 bg-white py-1 px-2 text-sm font-medium hover:bg-gray-100 hover:text-indigo-700 focus:z-10 focus:text-indigo-700 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:hover:text-white dark:focus:text-white",
              modeSelectorTextColor(FormMode.EXTERNAL)
            )}
            onClick={() => props.setMode(FormMode.EXTERNAL)}
            disabled={props.disabled}
          >
            External
          </button>
          <button
            type="button"
            className={classNames(
              "border-t border-b border-r border-gray-200 bg-white py-1 px-2 text-sm font-medium hover:bg-gray-100 hover:text-indigo-700 focus:z-10 focus:text-indigo-700 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:hover:text-white dark:focus:text-white",
              modeSelectorTextColor(FormMode.TRANSFER)
            )}
            onClick={() => props.setMode(FormMode.TRANSFER)}
            disabled={props.disabled}
          >
            Transfer
          </button>
          <button
            className={classNames(
              "rounded-r-md border border-gray-200 bg-white py-1 px-2 text-sm font-medium hover:bg-gray-100 hover:text-indigo-700 focus:z-10 focus:text-indigo-700 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:hover:text-white dark:focus:text-white",
              modeSelectorTextColor(FormMode.INCOME)
            )}
            type="button"
            onClick={() => props.setMode(FormMode.INCOME)}
            disabled={props.disabled}
          >
            Income
          </button>
        </div>
      </div>

      {props.children}
    </div>
  );
};
