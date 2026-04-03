import { type Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import type { DefaultArgs } from '@prisma/client/runtime/library.js';
import Logger from '../utils/Logger.js';

// Fix for BigInt not being serializable
// eslint-disable-next-line no-extend-native
// @ts-expect-error expected
BigInt.prototype.toJSON = function () {
  const int = Number.parseInt(this.toString(), 10);
  return int || this.toString();
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required for Prisma.');
}

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({
  adapter,
  /* log: ["query"] */
});

export type DatabaseRequestConfig = {
  maxWait?: number;
  timeout?: number;
};

export const performDatabaseRequest = async (
  transactionBody: (prismaTx: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>) => any,
  prismaClient = null,
  transactionConfig = null
) => {
  if (!prismaClient) {
    return prisma.$transaction(
      async (prismaTx: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>) => {
        return transactionBody(prismaTx);
      },
      transactionConfig
    );
  }
  return transactionBody(prismaClient);
};

export default {
  prisma,
  setupPrismaTransaction: performDatabaseRequest,
};
