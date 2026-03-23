'use server';
import {UpsertTransactionAPIResponse} from '@/actions/txform/types';
import {ExpenseFormSchema} from '@/components/txform/expense/types';
import {IncomeFormSchema} from '@/components/txform/income/types';
import {TransferFormSchema} from '@/components/txform/transfer/types';
import {
  TransactionFormSchema,
  transactionFormValidationSchema,
} from '@/components/txform/types';
import {assertDefined} from '@/lib/assert';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {updateCoreDataCache, updateTransactionDataCache} from '@/lib/db/cache';
import {withAuth} from '@/lib/grpc/auth';
import {ledgerClient} from '@/lib/grpc/client';
import {
  ExpenseFormInput,
  IncomeFormInput,
  RepaymentInput,
  SharingType,
  TransactionPrototypeInput,
  TransferFormInput,
  WriteTransactionFormRequest,
} from '@/lib/grpc/gen/prosper/v1/ledger';
import {dateToTimestamp} from '@/lib/grpc/timestamp';
import {
  TransactionPrototype,
  TransactionPrototypeList,
  WithdrawalOrDepositPrototype,
  transactionPrototypeListSchema,
} from '@/lib/txsuggestions/TransactionPrototype';
import {dollarToNanos} from '@/lib/util/util';

const sharingTypeMap: Record<ExpenseFormSchema['sharingType'], SharingType> = {
  PAID_SELF_NOT_SHARED: SharingType.PAID_SELF_NOT_SHARED,
  PAID_SELF_SHARED: SharingType.PAID_SELF_SHARED,
  PAID_OTHER_OWED: SharingType.PAID_OTHER_OWED,
  PAID_OTHER_REPAID: SharingType.PAID_OTHER_REPAID,
};

export async function upsertTransaction(
  transactionId: number | null,
  unsafeProtos: TransactionPrototypeList,
  unsafeData: TransactionFormSchema
): Promise<UpsertTransactionAPIResponse> {
  const auth = await getAuthContextOrRedirect();
  const validatedData = transactionFormValidationSchema.safeParse(unsafeData);
  if (!validatedData.success) {
    return {
      status: 'CLIENT_ERROR',
      errors: validatedData.error.flatten(),
    };
  }
  const data = validatedData.data;
  const usedProtos = parseProtos(unsafeProtos);
  const tagNames = pickTagNames(data);
  const request: Omit<WriteTransactionFormRequest, 'sessionId'> = {
    transactionIdToSupersede: transactionId ?? undefined,
    tagNames,
    usedProtos,
    form: buildForm(data),
  };
  await ledgerClient.writeTransactionForm(withAuth(request, auth));
  // Invalidate caches because new tags, trips, or transactions may have been created.
  await updateCoreDataCache(auth.userId);
  await updateTransactionDataCache(auth.userId);
  return {status: 'SUCCESS'};
}

function parseProtos(
  unsafeProtos: TransactionPrototype[]
): TransactionPrototypeInput[] {
  const validatedProtos =
    transactionPrototypeListSchema.safeParse(unsafeProtos);
  if (!validatedProtos.success) {
    console.warn('Invalid transaction prototypes', validatedProtos.error);
    return [];
  }
  // Transfer protos have a withdrawal+deposit pair, both of which need
  // to be recorded so the next page load doesn't re-suggest either leg.
  const flat: WithdrawalOrDepositPrototype[] = validatedProtos.data.flatMap(
    p => (p.type === 'transfer' ? [p.deposit, p.withdrawal] : [p])
  );
  return flat.map(p => ({
    externalId: p.externalTransactionId,
    externalDescription: p.originalDescription,
  }));
}

function pickTagNames(form: TransactionFormSchema): string[] {
  if (form.expense) {
    return form.expense.tagNames;
  }
  if (form.income) {
    return form.income.tagNames;
  }
  if (form.transfer) {
    return form.transfer.tagNames;
  }
  return [];
}

function buildForm(
  form: TransactionFormSchema
): WriteTransactionFormRequest['form'] {
  if (form.expense) {
    return {oneofKind: 'expense', expense: expenseInput(form.expense)};
  }
  if (form.income) {
    return {oneofKind: 'income', income: incomeInput(form.income)};
  }
  if (form.transfer) {
    return {oneofKind: 'transfer', transfer: transferInput(form.transfer)};
  }
  throw new Error('No form variant present');
}

function expenseInput(e: ExpenseFormSchema): ExpenseFormInput {
  let repayment: RepaymentInput | undefined;
  if (e.sharingType === 'PAID_OTHER_REPAID') {
    assertDefined(e.repayment);
    repayment = {
      accountId: e.repayment.accountId,
      timestamp: formDateToTimestamp(e.repayment.timestamp),
      categoryId: e.repayment.categoryId,
    };
  }
  return {
    timestamp: formDateToTimestamp(e.timestamp),
    description: e.description ?? '',
    vendor: e.vendor,
    categoryId: e.categoryId,
    accountId: e.accountId ?? undefined,
    currency: e.currency ?? undefined,
    payer: e.payer ?? undefined,
    companion: e.companion ?? undefined,
    amountNanos: dollarToNanos(e.amount),
    ownShareNanos: dollarToNanos(e.ownShareAmount),
    tripName: e.tripName ?? undefined,
    sharingType: sharingTypeMap[e.sharingType],
    repayment,
  };
}

function incomeInput(in_: IncomeFormSchema): IncomeFormInput {
  return {
    timestamp: formDateToTimestamp(in_.timestamp),
    description: in_.description ?? '',
    payer: in_.payer,
    categoryId: in_.categoryId,
    accountId: in_.accountId,
    amountNanos: dollarToNanos(in_.amount),
    isShared: in_.isShared,
    companion: in_.companion ?? undefined,
    ownShareNanos: dollarToNanos(in_.ownShareAmount),
    parentTransactionId: in_.parentTransactionId ?? undefined,
  };
}

function transferInput(t: TransferFormSchema): TransferFormInput {
  return {
    timestamp: formDateToTimestamp(t.timestamp),
    description: t.description ?? '',
    categoryId: t.categoryId,
    fromAccountId: t.fromAccountId,
    toAccountId: t.toAccountId,
    amountSentNanos: dollarToNanos(t.amountSent),
    amountReceivedNanos: dollarToNanos(t.amountReceived),
  };
}

// formDateToTimestamp converts a form-field timestamp into a wire
// Timestamp.
function formDateToTimestamp(t: Date | string) {
  const date = t instanceof Date ? t : new Date(t);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid form timestamp: ${JSON.stringify(t)}`);
  }
  return dateToTimestamp(date);
}
