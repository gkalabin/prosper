import {DB} from '@/lib/db';
import prisma from '@/lib/prisma';
import {getUserId} from '@/lib/user';
import {NextRequest, NextResponse} from 'next/server';

export interface AccountMappingRequest {
  bankId: number;
  mapping: {
    internalAccountId: number;
    externalAccountId: string;
  }[];
}

export async function POST(request: NextRequest): Promise<Response> {
  const input: AccountMappingRequest = await request.json();
  const {bankId, mapping: mappingRaw} = input;
  const userId = await getUserId();
  const db = new DB({userId});
  const [bank] = await db.bankFindMany({where: {id: bankId}});
  if (!bank) {
    return new Response(`bank not found`, {status: 404});
  }
  const dbAccounts = await db.bankAccountFindMany({where: {bankId}});
  const mapping = mappingRaw.filter(m =>
    dbAccounts.some(a => a.id === m.internalAccountId)
  );
  const result = await prisma.$transaction(async tx => {
    await tx.externalAccountMapping.deleteMany({
      where: {
        internalAccountId: {
          in: dbAccounts.map(x => x.id),
        },
      },
    });
    await tx.externalAccountMapping.createMany({
      data: mapping.map(m => ({
        externalAccountId: m.externalAccountId,
        internalAccountId: m.internalAccountId,
        userId,
      })),
    });
    return await tx.externalAccountMapping.findMany({
      where: {
        internalAccountId: {
          in: dbAccounts.map(x => x.id),
        },
        userId,
      },
    });
  });
  return NextResponse.json(result);
}
