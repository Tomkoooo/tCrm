import mongoose, { type ClientSession } from 'mongoose';

/** Standalone MongoDB (no replica set) — common for self-hosted installs. */
export function isStandaloneMongoError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    /retryable writes/i.test(msg) ||
    /replica set member/i.test(msg) ||
    /Transaction numbers are only allowed/i.test(msg) ||
    /multi-document transactions/i.test(msg)
  );
}

/**
 * Runs `fn` in a transaction when the deployment supports it (replica set).
 * On standalone MongoDB, runs `fn` without a session instead.
 */
export async function runWithOptionalTransaction(
  fn: (session: ClientSession | undefined) => Promise<void>
): Promise<void> {
  const session = await mongoose.startSession();
  try {
    try {
      await session.withTransaction(async () => {
        await fn(session);
      });
    } catch (error) {
      if (!isStandaloneMongoError(error)) {
        throw error;
      }
      await fn(undefined);
    }
  } finally {
    await session.endSession();
  }
}
