'use server';
import {upsertExpense} from '@/actions/txform/expense';
import {upsertIncome} from '@/actions/txform/income';
import {upsertTransfer} from '@/actions/txform/transfer';
import {
  DatabaseUpdates,
  UpsertTransactionAPIResponse,
} from '@/actions/txform/types';
import {
  TransactionFormSchema,
  transactionFormValidationSchema,
} from '@/components/txform/types';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {DB, invalidateCache} from '@/lib/db';
import {
  TransactionPrototype,
  TransactionPrototypeList,
  transactionPrototypeListSchema,
} from '@/lib/txsuggestions/TransactionPrototype';
import {Transaction} from '@prisma/client';

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
  const db = new DB({userId});
  let transaction: Transaction | null = null;
  if (transactionId) {
    transaction = await db.transactionById(transactionId);
    if (!transaction) {
      return {
        status: 'CLIENT_ERROR',
        errors: {
          root: [`Transaction ${transactionId} not found`],
        },
      };
    }
  }
  const dbUpdates: DatabaseUpdates = {
    tags: [],
    transactionLinks: {},
    transactions: {},
    trip: null,
    prototypes: [],
  };
  if (data.expense) {
    await upsertExpense(dbUpdates, transaction, protos, userId, data);
    await invalidateCache(userId);
    return {
      status: 'SUCCESS',
      dbUpdates,
    };
  }
  if (data.transfer) {
    await upsertTransfer(dbUpdates, transaction, protos, userId, data);
    await invalidateCache(userId);
    return {
      status: 'SUCCESS',
      dbUpdates,
    };
  }
  if (data.income) {
    await upsertIncome(dbUpdates, transaction, protos, userId, data);
    await invalidateCache(userId);
    return {
      status: 'SUCCESS',
      dbUpdates,
    };
  }
  return {
    status: 'CLIENT_ERROR',
    errors: {
      root: [`No data found in the form`],
    },
  };
}

function parseProtos(
  unsafeProtos: TransactionPrototype[]
): TransactionPrototype[] {
  const validatedProtos =
    transactionPrototypeListSchema.safeParse(unsafeProtos);
  if (!validatedProtos.success) {
    console.warn('Invalid transaction prototypes', validatedProtos.error);
    // We can continue with the insert as the transaction might still be possible to create.
    return [];
  }
  return validatedProtos.data;
}
