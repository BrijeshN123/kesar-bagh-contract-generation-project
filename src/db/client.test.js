import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('PostgreSQL query adapter converts question-mark placeholders to numbered parameters', async () => {
  const source=await readFile(new URL('./client.js',import.meta.url),'utf8');
  assert.match(source,/function toPostgres\(statement\)/);
  assert.match(source,/statement\.replace\(\/\\\?\/g/);
  assert.match(source,/sql\.unsafe\(toPostgres\(query\), values\)/);
});
