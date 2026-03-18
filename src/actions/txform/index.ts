'use server';
import {UpsertTransactionAPIResponse} from '@/actions/txform/types';
import {writeTransactionV2} from '@/actions/txform/writeTransaction';
import {
  TransactionFormSchema,
  transactionFormValidationSchema,
} from '@/components/txform/types';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {updateCoreDataCache, updateTransactionDataCache} from '@/lib/db/cache';
import {
  TransactionPrototype,
  TransactionPrototypeList,
  transactionPrototypeListSchema,
} from '@/lib/txsuggestions/TransactionPrototype';

export async function upsertTransaction(
  transactionId: number | null,
  unsafeProtos: TransactionPrototypeList,
  unsafeData: TransactionFormSchema
): Promise<UpsertTransactionAPIResponse> {
  const userId = await getUserIdOrRedirect();
  const validatedData = transactionFormValidationSchema.safeParse(unsafeData);
  if (!validatedData.success) {
    return {
      status: 'CLIENT_ERROR',
      errors: validatedData.error.flatten(),
    };
  }
  const data = validatedData.data;
  const protos = parseProtos(unsafeProtos);
  await writeTransactionV2({
    userId,
    form: data,
    protos,
    transactionIdToSupersede: transactionId,
  });
  // Invalidate caches because new tags, trips, or transactions may have been created.
  await updateCoreDataCache(userId);
  await updateTransactionDataCache(userId);

  return {status: 'SUCCESS'};
}

function parseProtos(
  unsafeProtos: TransactionPrototype[]
): TransactionPrototype[] {
  const validatedProtos =
    transactionPrototypeListSchema.safeParse(unsafeProtos);
  if (!validatedProtos.success) {
    console.warn('Invalid transaction prototypes', validatedProtos.error);
    // Continue without prototypes — the transaction can still be created.
    return [];
  }
  return validatedProtos.data;
}
