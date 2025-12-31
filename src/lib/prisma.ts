import {isProd} from '@/lib/util/env';
import {PrismaClient} from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {

  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (!isProd()) {
  globalThis.prisma = prisma;
}
