import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {withAuth} from '@/lib/grpc/auth';
import {openBankingClient} from '@/lib/grpc/client';
import {AccountMapping} from '@/lib/grpc/gen/prosper/v1/openbanking';
import {logApi} from '@/lib/util/log';
import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';

const accountMappingSchema = z.object({
  internalAccountId: z.number().int().nonnegative(),
  externalAccountId: z.string().min(1),
});

const accountMappingRequestSchema = z.object({
  bankId: z.number().int().positive(),
  mapping: z.array(accountMappingSchema),
});

export type AccountMappingRequest = z.infer<typeof accountMappingRequestSchema>;

export async function POST(request: NextRequest): Promise<Response> {
  const parsed = accountMappingRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({error: parsed.error.format()}, {status: 400});
  }
  const auth = await getAuthContextOrRedirect();
  logApi('POST', '/api/open-banking/mapping', {
    userId: auth.userId,
    bankId: parsed.data.bankId,
    mappings: parsed.data.mapping.length,
  });
  const mappings: AccountMapping[] = parsed.data.mapping;
  await openBankingClient.setMappings(
    withAuth({bankId: parsed.data.bankId, mappings}, auth)
  );
  const {response} = await openBankingClient.listMappings(
    withAuth({bankId: parsed.data.bankId}, auth)
  );
  return NextResponse.json(response.mappings);
}
