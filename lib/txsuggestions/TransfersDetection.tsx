import { differenceInHours, differenceInMilliseconds } from "date-fns";
import {
  TransactionPrototype,
  TransferPrototype,
  WithdrawalOrDepositPrototype,
  WithdrawalPrototype,
} from "lib/txsuggestions/TransactionSuggestion";

const MAX_TRANSFER_WINDOW_HOURS = 2;

export function combineTransfers(
  prototypes: WithdrawalOrDepositPrototype[]
): TransactionPrototype[] {
  // find all the matching deposits and withdrawals
  const transfersCandidates = [] as TransferPrototype[];
  for (const deposit of prototypes) {
    if (deposit.type != "deposit") {
      continue;
    }
    const [closestWithdrawal] = prototypes
      .filter(
        (withdrawal): withdrawal is WithdrawalPrototype =>
          withdrawal.type == "withdrawal" &&
          deposit.absoluteAmountCents == withdrawal.absoluteAmountCents &&
          deposit.internalAccountId != withdrawal.internalAccountId &&
          differenceInHours(deposit.timestampEpoch, withdrawal.timestampEpoch) <
            MAX_TRANSFER_WINDOW_HOURS
      )
      // sort, so the closest to `to` transfer comes first
      .sort(
        (f1, f2) =>
          differenceInMilliseconds(deposit.timestampEpoch, f1.timestampEpoch) -
          differenceInMilliseconds(deposit.timestampEpoch, f2.timestampEpoch)
      );
    if (!closestWithdrawal) {
      continue;
    }
    transfersCandidates.push({
      type: "transfer",
      withdrawal: closestWithdrawal,
      deposit,
    });
  }

  // pick the transfers which have the closest timestamps
  transfersCandidates.sort(
    (f1, f2) =>
      Math.abs(f1.withdrawal.timestampEpoch - f1.deposit.timestampEpoch) -
      Math.abs(f2.withdrawal.timestampEpoch - f2.deposit.timestampEpoch)
  );
  const transfers = [] as TransferPrototype[];
  for (const transfer of transfersCandidates) {
    if (
      transfers.some(
        (t) =>
          t.withdrawal.externalTransactionId ==
            transfer.withdrawal.externalTransactionId ||
          t.deposit.externalTransactionId ==
            transfer.deposit.externalTransactionId
      )
    ) {
      continue;
    }
    transfers.push(transfer);
  }

  const usedInTransfer = new Set<string>(
    transfers.flatMap((x) => [
      x.withdrawal.externalTransactionId,
      x.deposit.externalTransactionId,
    ])
  );
  return [
    ...transfers,
    ...prototypes.filter((x) => !usedInTransfer.has(x.externalTransactionId)),
  ];
}
