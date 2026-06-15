import { MongoMemoryServer } from 'mongodb-memory-server';

/** Shared factory — allows time for first-run binary download on slow networks. */
export async function createTestMongo(): Promise<MongoMemoryServer> {
  return MongoMemoryServer.create({
    instance: {
      launchTimeout: 120_000,
    },
  });
}
