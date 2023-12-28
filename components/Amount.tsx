import classNames from "classnames";
import { Amount as AmountModel } from "lib/ClientSideModel";

export const Amount = (props: {
  amount: AmountModel;
  sign?: number;
  className?: string;
}) => {
  if (props.sign < 0) {
    return (
      <span className={classNames(props.className, "text-red-900")}>
        -{props.amount.format()}
      </span>
    );
  }
  if (props.sign > 0) {
    return (
      <span className={classNames(props.className, "text-green-900")}>
        +{props.amount.format()}
      </span>
    );
  }

  return <span className={props.className}>{props.amount.format()}</span>;
};
