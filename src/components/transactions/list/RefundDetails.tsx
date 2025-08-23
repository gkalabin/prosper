import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {Transaction} from '@/lib/model/transactionNEW/Transaction';
import {format} from 'date-fns';

export function RefundDetails({
  transaction: {transactionId},
}: {
  transaction: Transaction;
}) {
  const {transactionLinks} = useTransactionDataContext();
  const links = transactionLinks
    .filter(l => l.kind == 'REFUND')
    .filter(
      l =>
        l.expense.id == transactionId ||
        l.refunds.some(r => r.id == transactionId)
    );
  if (!links.length) {
    return null;
  }
  if (links.length > 1) {
    return (
      <div className="text-destructive">
        Multiple refund links found: {links.map(d => d.id).join(', ')}
      </div>
    );
  }
  const {id: linkId, expense, refunds} = links[0];
  if (transactionId == expense.id) {
    return (
      <div>
        <div>This expense was refunded in</div>
        <ul className="ml-4 list-disc">
          {refunds.map(r => (
            <li key={r.id}>
              {r.payer} on {format(r.timestampEpoch, 'yyyy-MM-dd')}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (refunds.some(r => r.id == transactionId)) {
    return (
      <div>
        <div>This transaction is a refund for</div>
        <div className="ml-4">
          {expense.vendor} on {format(expense.timestampEpoch, 'yyyy-MM-dd')}
        </div>
      </div>
    );
  }
  throw new Error(
    `Link ${linkId} is not connected to transaction ${transactionId}`
  );
}
