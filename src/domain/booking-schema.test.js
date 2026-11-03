import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDraft, parseForGeneration } from './booking-schema.js';

test('draft parser accepts a valid minimal booking draft', () => {
  const result = parseDraft({ clientName: 'Test Client', eventName: 'Test Event', eventDate: '2027-01-01' });
  assert.equal(result.success, true);
});

test('draft parser rejects invalid email types', () => {
  const result = parseDraft({ emailAddress: 123 });
  assert.equal(result.success, false);
});

test('generation parser accepts a completed booking payload', () => {
  const result = parseForGeneration({ clientName: 'Test Client', eventName: 'Test Event', eventDate: '2027-01-01', guestCount: 20 });
  assert.equal(result.success, true);
});
