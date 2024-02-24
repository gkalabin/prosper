import prisma from '@/lib/prisma';
import {getUserId} from '@/lib/user';
import { getServerSession } from 'next-auth/next';
import {NextRequest, NextResponse} from 'next/server';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { redirect } from 'next/navigation';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest): Promise<Response> {
  // const session = await getServerSession(authOptions);
  // if (session?.user?.id) {
  //   return redirect("/overview");
  // }
  
  const {login, password} = (await request.json()) as {
    login: string;
    password: string;
  };
  const newUser = await prisma.$transaction(async tx => {
    const rounds = 10 + Math.round(10*Math.random());
    const hash = await bcrypt.hash(password, rounds);
    const user = await tx.user.create({data: {
      login,
      password: hash,
    }});

    return user;
  });
  return NextResponse.json(newUser);
}
