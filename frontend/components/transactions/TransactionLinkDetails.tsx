import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {format} from 'date-fns';

export function DebtRepaymentDetails({
  transaction: {id},
}: {
  transaction: Transaction;
}) {
  const {transactionLinks} = useTransactionDataContext();
  const debts = transactionLinks
    .filter(l => l.kind == 'DEBT_SETTLING')
    .filter(l => l.expense.id == id || l.repayment.id == id);
  if (!debts.length) {
    return null;
  }
  if (debts.length > 1) {
    throw new Error(
      `Multiple debt links found for transaction ${id}: ${debts.map(d => d.id).join(', ')}`
    );
  }
  const {id: linkId, expense, repayment} = debts[0];
  if (id == expense.id) {
    return (
      <div className="text-muted-foreground mt-3 text-sm">
        Repaid in {repayment.vendor} on{' '}
        {format(repayment.timestampEpoch, 'yyyy-MM-dd')}
      </div>
    );
  }
  if (id == repayment.id) {
    return (
      <div className="text-muted-foreground mt-3 text-sm">
        Repayment for {expense.vendor} paid by {expense.payer} on{' '}
        {format(expense.timestampEpoch, 'yyyy-MM-dd')}
      </div>
    );
  }
  throw new Error(`Link ${linkId} is not connected to transaction ${id}`);
}

export function RefundDetails({transaction: {id}}: {transaction: Transaction}) {
  const {transactionLinks} = useTransactionDataContext();
  const links = transactionLinks
    .filter(l => l.kind == 'REFUND')
    .filter(l => l.expense.id == id || l.refunds.some(r => r.id == id));
  if (!links.length) {
    return null;
  }
  if (links.length > 1) {
    throw new Error(
      `Multiple refund links found for transaction ${id}: ${links.map(l => l.id).join(', ')}`
    );
  }
  const {id: linkId, expense, refunds} = links[0];
  if (id == expense.id) {
    return (
      <div className="text-muted-foreground mt-3 text-sm">
        Refunded in
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
  if (refunds.some(r => r.id == id)) {
    return (
      <div className="text-muted-foreground mt-3 text-sm">
        Refund for {expense.vendor} on{' '}
        {format(expense.timestampEpoch, 'yyyy-MM-dd')}
      </div>
    );
  }
  throw new Error(`Link ${linkId} is not connected to transaction ${id}`);
}
