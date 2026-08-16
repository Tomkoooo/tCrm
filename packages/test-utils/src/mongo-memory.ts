import { MongoMemoryServer } from 'mongodb-memory-server';

export async function createTestMongo(): Promise<MongoMemoryServer> {
  return MongoMemoryServer.create({
    instance: {
      launchTimeout: 120_000,
    },
  });
}
