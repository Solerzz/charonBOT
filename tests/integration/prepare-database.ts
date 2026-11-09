import { Client } from 'pg';

import { assertDisposableDatabaseEnvironment } from './database-test-utils.js';

async function prepare(): Promise<void> {
  assertDisposableDatabaseEnvironment();
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  try {
    await client.connect();
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
      END $$;
      GRANT USAGE ON SCHEMA public TO anon, authenticated;
      GRANT SELECT ON TABLE public."VoiceCreator", public."TemporaryRoom", public."_prisma_migrations",
        public."RoomPresence", public."RoomAllowedMember", public."PendingOwnershipTransfer" TO anon, authenticated;
    `);
    console.log('Local database test grants prepared');
  } finally {
    await client.end();
  }
}

prepare().catch(() => {
  console.error('Local database preparation failed');
  process.exitCode = 1;
});
