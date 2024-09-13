'use server';
import {upsertExpense} from '@/actions/txform/expense';
import {upsertIncome} from '@/actions/txform/income';
import {upsertTransfer} from '@/actions/txform/transfer';
import {
  TransactionFormSchema,
  transactionFormValidationSchema,
} from '@/components/txform/v2/types';
import {DB} from '@/lib/db';
import {
  TransactionPrototypeList,
  transactionPrototypeListSchema,
} from '@/lib/txsuggestions/TransactionPrototype';
import {getUserId} from '@/lib/user';
import {Transaction} from '@prisma/client';
import {notFound} from 'next/navigation';

export async function upsertTransaction(
  transactionId: number | null,
  unsafeProtos: TransactionPrototypeList,
  unsafeData: TransactionFormSchema
) {
  const userId = await getUserId();
  const validatedData = transactionFormValidationSchema.safeParse(unsafeData);
  if (!validatedData.success) {
    return {
      errors: validatedData.error.flatten().fieldErrors,
    };
  }
  const data = validatedData.data;
  const validatedProtos =
    transactionPrototypeListSchema.safeParse(unsafeProtos);
  if (!validatedProtos.success) {
    const fieldErrors = validatedProtos.error.flatten().fieldErrors;
    return {
      // Without Object.fromEntries, fieldErrors is not serializable as it contains [entries] and [iterator] properties.
      errors: Object.fromEntries(
        Object.entries(fieldErrors).map(([key, value]) => [
          key,
          Array.isArray(value) ? [...value] : value,
        ])
      ),
    };
  }
  const db = new DB({userId});
  let transaction: Transaction | null = null;
  if (transactionId) {
    transaction = await db.transactionById(transactionId);
    if (!transaction) {
      console.warn(`Transaction ${transactionId} is not found`);
      return notFound();
    }
  }
  if (data.expense) {
    await upsertExpense(transaction, validatedProtos.data, userId, data);
    return {};
  }
  if (data.transfer) {
    await upsertTransfer(transaction, validatedProtos.data, userId, data);
    return {};
  }
  if (data.income) {
    await upsertIncome(transaction, validatedProtos.data, userId, data);
    return {};
  }
  console.warn('No data found in the form', data);
  throw new Error('Invalid form type');
}
