import postgres from 'postgres';

function toPostgres(statement) {
  let index = 0;
  return statement.replace(/\?/g, () => `$${++index}`);
}

export async function openDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required for the hosted database.');
  const sql = postgres(connectionString, {
    max: Number(process.env.DB_POOL_MAX || 5), idle_timeout: 20,
    connect_timeout: 10, ssl: 'require', prepare: false,
  });
  try {
    await sql`CREATE TABLE IF NOT EXISTS public.bookings (
      id text PRIMARY KEY, contract_ref text NOT NULL UNIQUE,
      status text NOT NULL DEFAULT 'draft', data_json jsonb NOT NULL,
      created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
    )`;
    await sql`CREATE TABLE IF NOT EXISTS public.contract_documents (
      id text PRIMARY KEY, booking_id text NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
      version integer NOT NULL, filename text NOT NULL,
      mime_type text NOT NULL DEFAULT 'application/pdf', file_bytes bytea NOT NULL,
      template_version text NOT NULL, policy_version text NOT NULL,
      snapshot_json jsonb NOT NULL, created_at timestamptz NOT NULL,
      UNIQUE (booking_id, version)
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bookings_updated ON public.bookings(updated_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_documents_booking ON public.contract_documents(booking_id, version DESC)`;
  } catch (error) {
    await sql.end({ timeout: 5 }).catch(() => {});
    throw error;
  }
  return {
    execute: async (statement, args = []) => {
      const query = typeof statement === 'string' ? statement : statement.sql;
      const values = typeof statement === 'string' ? args : (statement.args || []);
      const result = await sql.unsafe(toPostgres(query), values);
      return { rows: result, rowsAffected: result.count ?? 0, lastInsertRowid: null };
    },
    batch: async (statements) => sql.begin(async (tx) => {
      for (const item of statements) {
        if (typeof item === 'string') await tx.unsafe(item);
        else await tx.unsafe(toPostgres(item.sql), item.args || []);
      }
    }),
    close: async () => { await sql.end({ timeout: 5 }); },
  };
}
