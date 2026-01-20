import {PrismaClient} from '@prisma/client';

const dbUrl =
  process.env.DB_URL ||
  `mysql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

export const prisma = new PrismaClient({datasources: {db: {url: dbUrl}}});
