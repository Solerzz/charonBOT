import { Client } from 'pg';
import { describe, expect, it } from 'vitest';

const securityTest = process.env.RUN_DATABASE_SECURITY_TESTS === 'true' ? it : it.skip;

describe('database row-level security', () => {
  securityTest('blocks API roles while preserving backend access to protected tables', async () => {
    const url = process.env.DATABASE_URL;
    expect(Boolean(url)).toBe(true);

    const client = new Client({
      connectionString: url,
      connectionTimeoutMillis: 10_000,
      query_timeout: 5_000,
    });

    try {
      await client.connect();
      // This opt-in is safe for read-only checks; it never inserts test fixtures.
      await client.query('BEGIN READ ONLY');

      const tables = ['PendingOwnershipTransfer', 'RoomAllowedMember', 'RoomMemberBlock', 'RoomPresence', 'TemporaryRoom', 'VoiceCreator', '_prisma_migrations'];
      const protection = await client.query<{ name: string; protected: boolean }>(`
        SELECT c.relname AS name, c.relrowsecurity AS protected
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])
        ORDER BY c.relname
      `, [tables]);

      expect(protection.rows).toEqual([
        { name: 'PendingOwnershipTransfer', protected: true },
        { name: 'RoomAllowedMember', protected: true },
        { name: 'RoomMemberBlock', protected: true },
        { name: 'RoomPresence', protected: true },
        { name: 'TemporaryRoom', protected: true },
        { name: 'VoiceCreator', protected: true },
        { name: '_prisma_migrations', protected: true },
      ]);

      const policies = await client.query<{ count: number }>(`
        SELECT count(*)::integer AS count FROM pg_policies
        WHERE schemaname = 'public' AND tablename = ANY($1::text[])
      `, [tables]);
      expect(policies.rows[0]?.count).toBe(0);

      const history = await client.query<{ count: number }>(
        'SELECT count(*)::integer AS count FROM public."_prisma_migrations"',
      );
      // Existing history makes the subsequent API-role check non-vacuous.
      expect(history.rows[0]?.count).toBeGreaterThan(0);

      for (const role of ['anon', 'authenticated']) {
        await client.query(`SET LOCAL ROLE ${role}`);
        const identity = await client.query<{ role: string }>('SELECT current_user AS role');
        expect(identity.rows[0]?.role).toBe(role);

        for (const table of tables) {
          const visible = await client.query<{ count: number }>(
            `SELECT count(*)::integer AS count FROM public."${table}"`,
          );
          expect(visible.rows[0]?.count, `${role} must not see ${table}`).toBe(0);
        }

        await client.query('RESET ROLE');
      }
    } finally {
      try {
        await client.query('ROLLBACK');
      } finally {
        await client.end();
      }
    }
  }, 20_000);
});
