import { format, startOfMonth } from "date-fns";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { Transaction } from "lib/model/Transaction";

export function DebugTable(props: { transactions: Transaction[] }) {
  const displayCurrency = useDisplayCurrency();
  const { exchange } = useAllDatabaseDataContext();
  const zero = new AmountWithCurrency({
    amountCents: 0,
    currency: displayCurrency,
  });
  const transactionsSortedByMonthAndAmount = [...props.transactions].sort(
    (a, b) => {
      const aTs = startOfMonth(a.timestamp).getTime();
      const bTs = startOfMonth(b.timestamp).getTime();
      if (aTs != bTs) {
        return bTs - aTs;
      }
      const exchangedA = exchange.exchange(
        a.amount(),
        displayCurrency,
        a.timestamp
      );
      const exchangedB = exchange.exchange(
        b.amount(),
        displayCurrency,
        b.timestamp
      );
      return exchangedB.dollar() - exchangedA.dollar();
    }
  );
  const rows = [];
  let cumulativeAmount = zero;
  const TD = (props: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className="border p-2" {...props}>
      {props.children}
    </td>
  );
  let previousMonth = new Date(0);
  let transactionsShown = 0;
  let aggregateSum = zero;
  let aggregateCount = 0;
  let aggregateMin = zero;
  let aggregateMax = zero;
  for (const t of transactionsSortedByMonthAndAmount) {
    const exchanged = exchange.exchange(
      t.amount(),
      displayCurrency,
      t.timestamp
    );
    if (startOfMonth(t.timestamp).getTime() != previousMonth.getTime()) {
      if (aggregateCount > 0) {
        rows.push(
          <tr>
            <TD>&nbsp;</TD>
            <TD>
              {aggregateCount} transactions ranging from {aggregateMin.format()}{" "}
              to {aggregateMax.format()}
            </TD>
            <TD>{aggregateSum.format()}</TD>
            <TD>{cumulativeAmount.format()}</TD>
          </tr>
        );
      }

      previousMonth = startOfMonth(t.timestamp);
      cumulativeAmount = zero;
      aggregateCount = 0;
      aggregateSum = zero;
      aggregateMin = zero;
      aggregateMax = zero;
      transactionsShown = 0;
      rows.push(
        <tr>
          <TD colSpan={4} className="p-2 text-center text-lg font-medium">
            {format(t.timestamp, "MMMM yyyy")}
          </TD>
        </tr>
      );
    }
    cumulativeAmount = cumulativeAmount.add(exchanged);
    if (transactionsShown < 15) {
      rows.push(
        <tr key={t.id}>
          <TD>{format(t.timestamp, "yyyy-MM-dd")}</TD>
          <TD>
            {t.hasVendor() ? t.vendor() : ""} {t.hasPayer() ? t.payer() : ""}{" "}
            <span className="italic">{t.description}</span>
            <div className="text-xs text-slate-600">
              {t.category.nameWithAncestors}
            </div>
          </TD>
          <TD>{exchanged.format()}</TD>
          <TD>{cumulativeAmount.format()}</TD>
        </tr>
      );
      transactionsShown++;
    } else {
      aggregateSum = aggregateSum.add(exchanged);
      aggregateCount++;
      if (aggregateMin.cents() == 0 || exchanged.lessThan(aggregateMin)) {
        aggregateMin = exchanged;
      }
      if (aggregateMax.lessThan(exchanged)) {
        aggregateMax = exchanged;
      }
    }
  }
  return (
    <>
      <table className="table-auto border-collapse border">
        <thead>
          <TD>Date</TD>
          <TD>Vendor</TD>
          <TD>Amount</TD>
          <TD>Amount cumulative</TD>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </>
  );
}
