import {bankFormValidationSchema} from '@/lib/form-types/BankFormSchema';
import prisma from '@/lib/prisma';
import {getUserId} from '@/lib/user';
import {NextRequest, NextResponse} from 'next/server';

export async function POST(request: NextRequest): Promise<Response> {
  const userId = await getUserId();
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
  return NextResponse.json(result);
}
