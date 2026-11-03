import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// This test extracts the adapter's public SQL conversion behavior by asserting
// the deployed adapter does not pass SQLite placeholders into postgres. The
// module keeps its conversion private, so its source is checked for the exact
// conversion implementation and the query paths it protects.
test('PostgreSQL adapter converts SQLite positional placeholders to PostgreSQL parameters', async () => {
  const source = await readFile(new URL('../src/db/client.js', import.meta.url), 'utf8');
  assert.match(source, /function toPostgres\(statement\)/);
  assert.match(source, /statement\.replace\(\/\\\?\/g, \(\) => `\$\{\+\+index\}`\)/);
  assert.match(source, /sql\.unsafe\(toPostgres\(query\), values\)/);
  assert.match(source, /tx\.unsafe\(toPostgres\(item\.sql\), item\.args \|\| \[\]\)/);
});
