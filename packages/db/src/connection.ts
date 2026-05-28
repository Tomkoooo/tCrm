import { connections, connect, mongo } from 'mongoose';

const DB_NAME = process.env.MONGODB_DB_NAME ?? 'tcrm';

function getMongoUri(): string | undefined {
  return process.env.MONGODB_URI;
}

if (!getMongoUri()) {
  console.warn('MONGODB_URI is not set — database operations will fail at runtime');
}

let connectionPromise: Promise<typeof import('mongoose')> | null = null;

export async function connectDB(): Promise<void> {
  const mongoUri = getMongoUri();
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set');
  }

  if (connections[0]?.readyState === 1) {
    return;
  }

  if (connectionPromise) {
    await connectionPromise;
    return;
  }

  try {
    connectionPromise = connect(mongoUri, {
      dbName: DB_NAME,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      bufferCommands: false,
    } as Parameters<typeof connect>[1]);

    await connectionPromise;
  } catch (error) {
    connectionPromise = null;
    throw error;
  }
}

let _nativeClient: mongo.MongoClient | null = null;

export function getNativeClient(): mongo.MongoClient {
  const mongoUri = getMongoUri();
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set');
  }
  if (!_nativeClient) {
    _nativeClient = new mongo.MongoClient(mongoUri);
  }
  return _nativeClient;
}

let _uploadsBucket: mongo.GridFSBucket | null = null;

export function getUploadsBucket(): mongo.GridFSBucket {
  if (!_uploadsBucket) {
    const client = getNativeClient();
    _uploadsBucket = new mongo.GridFSBucket(client.db(DB_NAME), {
      bucketName: 'uploads',
    });
  }
  return _uploadsBucket;
}

export { DB_NAME };
