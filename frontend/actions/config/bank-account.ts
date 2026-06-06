'use server';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {
  AccountFormSchema,
  accountFormValidationSchema,
} from '@/lib/form-types/AccountFormSchema';
import {withAuth} from '@/lib/grpc/auth';
import {ledgerClient} from '@/lib/grpc/client';
import {AccountUnit, BankAccount} from '@/lib/grpc/gen/prosper/v1/ledger';
import {dollarToCents} from '@/lib/util/util';
import {type typeToFlattenedError} from 'zod';

export type UpsertBankAccountResult =
  | {
      status: 'SUCCESS';
      data: BankAccount;
    }
  | {
      status: 'CLIENT_ERROR';
      errors: typeToFlattenedError<AccountFormSchema>;
    };

export async function upsertBankAccount(
  accountId: number | null,
  unsafeData: AccountFormSchema
): Promise<UpsertBankAccountResult> {
  const auth = await getAuthContextOrRedirect();
  const validatedData = accountFormValidationSchema.safeParse(unsafeData);
  if (!validatedData.success) {
    return {
      status: 'CLIENT_ERROR',
      errors: validatedData.error.flatten(),
    };
  }
  const data = validatedData.data;
  const initialBalanceCents = dollarToCents(data.initialBalance);
  const {response} = await ledgerClient.upsertBankAccount(
    withAuth(
      {
        accountId: accountId ?? undefined,
        name: data.name,
        bankId: data.bankId,
        joint: data.isJoint,
        archived: data.isArchived,
        displayOrder: data.displayOrder,
        initialBalanceCents,
        unit: unitInputFromForm(data.unit),
      },
      auth
    )
  );
  return {
    status: 'SUCCESS',
    data: {
      id: response.accountId,
      name: data.name,
      bankId: data.bankId,
      joint: data.isJoint,
      archived: data.isArchived,
      displayOrder: data.displayOrder,
      initialBalanceCents,
    },
  };
}

function unitInputFromForm(unit: AccountFormSchema['unit']): AccountUnit {
  if (unit.kind === 'currency') {
    return {unit: {oneofKind: 'currencyCode', currencyCode: unit.currencyCode}};
  }
  return {
    unit: {
      oneofKind: 'stock',
      stock: {exchange: unit.exchange, ticker: unit.ticker},
    },
  };
}
