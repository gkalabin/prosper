import classNames from "classnames";
import { Amount as AmountModel } from "lib/ClientSideModel";
import { formatMoney } from "lib/Money";

export const Amount = (props: {
  amount: AmountModel;
  sign?: number;
  className?: string;
}) => {
  if (props.sign < 0) {
    return (
      <span className={classNames(props.className, "text-red-900")}>
        {formatMoney(
          -props.amount.cents(),
          props.amount.getCurrency()
        )}
      </span>
    );
  }
  if (props.sign > 0) {
    return (
      <span className={classNames(props.className, "text-green-900")}>
        {formatMoney(
          +props.amount.cents(),
          props.amount.getCurrency()
        )}
      </span>
    );
  }

  return (
    <span className={props.className}>
      {formatMoney(props.amount.cents(), props.amount.getCurrency())}
    </span>
  );
};
