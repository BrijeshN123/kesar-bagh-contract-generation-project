import test from 'node:test';
import assert from 'node:assert/strict';
import { createRepository } from './repository.js';

function mockDb(row) {
  return { execute: async (query) => ({ rows: query.sql?.includes('WHERE id') ? [row] : [row], rowsAffected: 1 }) };
}
const row = { id:'test-id', contract_ref:'KBP-TEST', status:'draft', data_json:{clientName:'Test Client'}, created_at:'2026-01-01T00:00:00Z', updated_at:'2026-01-01T00:00:00Z' };

test('repository reads PostgreSQL JSONB object values without parsing as strings', async () => {
  const repo=createRepository(mockDb(row));
  const result=await repo.getBooking('test-id');
  assert.equal(result.clientName,'Test Client');
});

test('repository reads stringified JSON values from SQLite-compatible adapters', async () => {
  const repo=createRepository(mockDb({...row,data_json:JSON.stringify(row.data_json)}));
  const result=await repo.getBooking('test-id');
  assert.equal(result.clientName,'Test Client');
});
