import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {Transaction} from '@/lib/model/transactionNEW/Transaction';
import {format} from 'date-fns';

export function DebtRepaymentDetails({
  transaction: {transactionId},
}: {
  transaction: Transaction;
}) {
  const {transactionLinks} = useTransactionDataContext();
  const debts = transactionLinks
    .filter(l => l.kind == 'DEBT_SETTLING')
    .filter(
      l => l.expense.id == transactionId || l.repayment.id == transactionId
    );
  if (!debts.length) {
    return null;
  }
  if (debts.length > 1) {
    return (
      <div className="text-destructive">
        Multiple debt links found: {debts.map(d => d.id).join(', ')}
      </div>
    );
  }
  const {id: linkId, expense, repayment} = debts[0];
  if (transactionId == expense.id) {
    return (
      <div>
        <div>This expense was repaid in</div>
        <div className="ml-4">
          {repayment.vendor} on {format(repayment.timestampEpoch, 'yyyy-MM-dd')}
        </div>
      </div>
    );
  }
  if (transactionId == repayment.id) {
    return (
      <div>
        <div>This transaction is a repayment for</div>
        <div className="ml-4">
          {expense.vendor} paid by {expense.payer} on{' '}
          {format(expense.timestampEpoch, 'yyyy-MM-dd')}
        </div>
      </div>
    );
  }
  throw new Error(
    `Link ${linkId} is not connected to transaction ${transactionId}`
  );
}
