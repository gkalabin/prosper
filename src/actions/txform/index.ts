'use server';
import {createExpense} from '@/actions/txform/expense';
import {createIncome} from '@/actions/txform/income';
import {createTransfer} from '@/actions/txform/transfer';
import {
  TransactionFormSchema,
  transactionFormValidationSchema,
} from '@/components/txform/v2/types';
import {
  TransactionPrototypeList,
  transactionPrototypeListSchema,
} from '@/lib/txsuggestions/TransactionPrototype';
import {getUserId} from '@/lib/user';

export async function upsertTransaction(
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
  if (data.expense) {
    await createExpense(validatedProtos.data, userId, data);
  }
  if (data.transfer) {
    await createTransfer(validatedProtos.data, userId, data);
  }
  if (data.income) {
    await createIncome(validatedProtos.data, userId, data);
  }
  return {};
}
