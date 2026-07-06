import mongoose from 'mongoose';

/** Ensure Atlas URIs include the unisync database and standard query params. */
export function normalizeMongoUri(uri: string): string {
  const trimmed = uri.trim();
  if (!trimmed.includes('mongodb+srv')) return trimmed;

  const hasDb = /\.mongodb\.net\/[^/?]+/.test(trimmed);
  if (hasDb) return trimmed;

  const [base, query] = trimmed.split('?');
  const withDb = base.endsWith('/') ? `${base}unisync` : `${base}/unisync`;
  const params = query || 'retryWrites=true&w=majority';
  return `${withDb}?${params}`;
}

function redactUri(uri: string): string {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

/** Connect only to MONGODB_URI (Atlas). Never falls back to local. */
export async function connectMongoAtlasOnly(): Promise<void> {
  const uri = normalizeMongoUri(
    process.env.MONGODB_URI || 'mongodb://localhost:27017/unisync'
  );
  if (!uri.includes('mongodb+srv')) {
    throw new Error('MONGODB_URI must be a mongodb+srv Atlas connection string for seed:atlas');
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
    console.log(`Connected to MongoDB Atlas (${mongoose.connection.name})`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/whitelist|Server selection|ReplicaSetNoPrimary|timed out/i.test(msg)) {
      console.error('\n❌ Cannot reach MongoDB Atlas from this network.');
      console.error('   Atlas uses TCP port 27017. Your connection to the cluster is timing out');
      console.error('   (often a firewall/ISP block — not a wrong password or missing IP in Atlas).');
      console.error('\n   Try one of these:');
      console.error('   • Mobile hotspot or VPN, then: npm run seed:atlas');
      console.error('   • Local dev data: npm run seed  (uses local MongoDB fallback)');
      console.error('   • Copy local → Atlas when 27017 works: bash scripts/push-local-to-atlas.sh\n');
    }
    throw err;
  }
}

export async function connectMongo(): Promise<void> {
  // If already connected, do not attempt to reconnect.
  if (mongoose.connection.readyState === 1) {
    return;
  }

  const primary = normalizeMongoUri(
    process.env.MONGODB_URI || 'mongodb://localhost:27017/unisync'
  );
  const fallback = normalizeMongoUri(
    process.env.MONGODB_URI_FALLBACK || 'mongodb://localhost:27017/unisync'
  );
  const opts = { serverSelectionTimeoutMS: 12000 };

  try {
    await mongoose.connect(primary, opts);
    console.log(`Connected to MongoDB (${mongoose.connection.name})`);
    return;
  } catch (primaryErr) {
    const msg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
    const canFallback =
      process.env.NODE_ENV === 'development' &&
      fallback !== primary &&
      /whitelist|Server selection|ECONNREFUSED|timed out/i.test(msg);

    if (!canFallback) {
      console.error('MongoDB connection error:', msg);
      if (/whitelist|Server selection|timed out/i.test(msg)) {
        console.error(
          'Tip: Atlas uses port 27017. If it is blocked on your network, set MONGODB_URI_FALLBACK=mongodb://localhost:27017/unisync or use a VPN.'
        );
      }
      throw primaryErr;
    }

    console.warn(`MongoDB primary failed (${redactUri(primary)}): ${msg}`);
    console.warn(`Trying fallback: ${redactUri(fallback)}`);
    try {
      await mongoose.connect(fallback, { ...opts, serverSelectionTimeoutMS: 5000 });
      console.log(`Connected to MongoDB (${mongoose.connection.name}) [local fallback]`);
    } catch (fallbackErr) {
      const fallbackMsg =
        fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      console.warn(`MongoDB fallback also failed: ${fallbackMsg}`);

      if (process.env.NODE_ENV === 'development') {
        console.warn('Attempting to launch in-memory MongoDB fallback...');
        try {
          const { MongoMemoryServer } = await import('mongodb-memory-server');
          const mongod = await MongoMemoryServer.create();
          const uri = mongod.getUri();
          
          await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
          console.log(`Connected to in-memory MongoDB (${mongoose.connection.name})`);

          // Seed the in-memory database with initial development data
          console.log('Seeding in-memory database with development data...');
          process.env.SEED_DISCONNECT = 'false';
          await import('./seed');
          return;
        } catch (memDbErr) {
          const memDbMsg = memDbErr instanceof Error ? memDbErr.message : String(memDbErr);
          console.error('In-memory MongoDB startup failed:', memDbMsg);
          throw memDbErr;
        }
      }

      throw fallbackErr;
    }
  }
}
