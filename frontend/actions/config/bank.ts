'use server';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {
  BankFormSchema,
  bankFormValidationSchema,
} from '@/lib/form-types/BankFormSchema';
import {withAuth} from '@/lib/grpc/auth';
import {ledgerClient} from '@/lib/grpc/client';
import {Bank} from '@/lib/grpc/gen/prosper/v1/ledger';
import {z} from 'zod';

export type UpsertBankResult =
  | {
      status: 'SUCCESS';
      data: Bank;
    }
  | {
      status: 'CLIENT_ERROR';
      errors: z.core.$ZodFlattenedError<BankFormSchema>;
    };

export async function upsertBank(
  bankId: number | null,
  unsafeData: BankFormSchema
): Promise<UpsertBankResult> {
  const auth = await getAuthContextOrRedirect();
  const validatedData = bankFormValidationSchema.safeParse(unsafeData);
  if (!validatedData.success) {
    return {
      status: 'CLIENT_ERROR',
      errors: z.flattenError(validatedData.error),
    };
  }
  const {name, displayOrder} = validatedData.data;
  const {response} = await ledgerClient.upsertBank(
    withAuth({bank: {id: bankId ?? 0, name, displayOrder}}, auth)
  );
  return {
    status: 'SUCCESS',
    data: {id: response.bankId, name, displayOrder},
  };
}
