import {CreateBankRequest} from '@/lib/model/forms/BankFormValues';
import prisma from '@/lib/prisma';
import {getUserId} from '@/lib/user';
import {NextRequest, NextResponse} from 'next/server';

export async function POST(request: NextRequest): Promise<Response> {
  const {name, displayOrder} = (await request.json()) as CreateBankRequest;
  const userId = await getUserId();
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
