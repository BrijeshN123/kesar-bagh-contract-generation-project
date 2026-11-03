import test from 'node:test';
import assert from 'node:assert/strict';
import { createRepository } from './repository.js';

function dbFor(dataJson) {
  const row={id:'booking-1',contract_ref:'KBP-TEST',status:'draft',data_json:dataJson,created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z'};
  return { execute: async () => ({rows:[row],rowsAffected:1}) };
}

test('JSONB object is returned without JSON.parse coercion', async()=>{
  const repo=createRepository(dbFor({clientName:'Test'}));
  const booking=await repo.getBooking('booking-1');
  assert.equal(booking.clientName,'Test');
});

test('string JSON returned by SQLite adapter remains supported', async()=>{
  const repo=createRepository(dbFor('{"clientName":"Test"}'));
  const booking=await repo.getBooking('booking-1');
  assert.equal(booking.clientName,'Test');
});
