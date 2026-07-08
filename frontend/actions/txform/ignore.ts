'use server';
import {originSchema} from '@/actions/txform/types';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {withAuth} from '@/lib/grpc/auth';
import {ledgerClient} from '@/lib/grpc/client';
import {OriginKey} from '@/lib/grpc/gen/prosper/v1/ledger';
import {z} from 'zod';

const originListSchema = z.array(originSchema).min(1);

function parseOrigins(unsafeOrigins: OriginKey[]): OriginKey[] {
  return originListSchema.parse(unsafeOrigins);
}

export async function ignoreDraftOrigins(
  unsafeOrigins: OriginKey[]
): Promise<void> {
  const auth = await getAuthContextOrRedirect();
  const origins = parseOrigins(unsafeOrigins);
  await ledgerClient.ignoreDraftOrigins(withAuth({origins}, auth));
}

export async function unignoreDraftOrigins(
  unsafeOrigins: OriginKey[]
): Promise<void> {
  const auth = await getAuthContextOrRedirect();
  const origins = parseOrigins(unsafeOrigins);
  await ledgerClient.unignoreDraftOrigins(withAuth({origins}, auth));
}
