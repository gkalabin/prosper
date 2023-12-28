import { Currency } from "../lib/model/Currency";
import { formatMoney } from "../lib/Money";
import classNames from "classnames";

export const Amount = (props: {
  amountCents: number;
  sign: number;
  currency: Currency;
  className?: string;
}) => {
  if (props.sign < 0) {
    return (
      <span className={classNames(
        props.className,
        "text-red-900"
      )}>
        {formatMoney(-props.amountCents, props.currency)}
      </span>
    );
  }
  if (props.sign > 0) {
    return (
      <span className={classNames(
        props.className,
        "text-green-900"
      )}>
        {formatMoney(+props.amountCents, props.currency)}
      </span>
    );
  }

  return <span className={props.className}>{formatMoney(props.amountCents, props.currency)}</span>;
};
