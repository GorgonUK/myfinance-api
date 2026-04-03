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

/** Prisma defaults to 5s; remote Postgres (Supabase, Vercel) often exceeds that for heavy reads. */
export const DEFAULT_PRISMA_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 30_000,
} as const;

/** One interactive tx per import: each row triggers full incremental balance/snapshot recompute (many queries). */
export const BULK_IMPORT_TRANSACTION_OPTIONS = {
  maxWait: 60_000,
  timeout: 300_000,
} as const;

/**
 * Sequential `$transaction([...])` with timeout. Prisma + driver adapter typings omit `timeout` on the
 * array overload; runtime still accepts it.
 */
export async function prismaSequentialTransaction(queries: ReadonlyArray<unknown>): Promise<any> {
  return prisma.$transaction(queries as any, {
    ...DEFAULT_PRISMA_TRANSACTION_OPTIONS,
  } as any);
}

export type DatabaseRequestConfig = {
  maxWait?: number;
  timeout?: number;
};

export const performDatabaseRequest = async (
  transactionBody: (prismaTx: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>) => any,
  prismaClient = null,
  transactionConfig: DatabaseRequestConfig | null = null
) => {
  if (!prismaClient) {
    const options =
      transactionConfig == null
        ? DEFAULT_PRISMA_TRANSACTION_OPTIONS
        : { ...DEFAULT_PRISMA_TRANSACTION_OPTIONS, ...transactionConfig };
    return prisma.$transaction(
      async (prismaTx: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>) => {
        return transactionBody(prismaTx);
      },
      options
    );
  }
  return transactionBody(prismaClient);
};

export default {
  prisma,
  setupPrismaTransaction: performDatabaseRequest,
};
