import {getUserIdOrRedirect} from '@/lib/auth/user';
import {invalidateCoreDataCache} from '@/lib/db/cache';
import {bankFormValidationSchema} from '@/lib/form-types/BankFormSchema';
import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';

export async function POST(request: NextRequest): Promise<Response> {
  const userId = await getUserIdOrRedirect();
  const validatedData = bankFormValidationSchema.safeParse(
    await request.json()
  );
  if (!validatedData.success) {
    return new Response(`Invalid form`, {
      status: 400,
    });
  }
  const {name, displayOrder} = validatedData.data;
  const result = await prisma.bank.create({
    data: {
      name,
      displayOrder,
      user: {
        connect: {
          id: userId,
        },
      },
    },
  });
  await invalidateCoreDataCache(userId);
  return NextResponse.json(result);
}
