import {isProd} from '@/lib/util/env';
import {PrismaClient} from '@prisma/client';

const prismaClientSingleton = () => {
  const dbUrl = `mysql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
  return new PrismaClient({datasources: {db: {url: dbUrl}}});
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (!isProd()) {
  globalThis.prisma = prisma;
}
