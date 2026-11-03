import { randomUUID } from 'node:crypto';
import { HOTEL } from '../templates/contract-clauses.js';

const now = () => new Date().toISOString();
const makeReference = () => `KBP-${new Date().getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`;
const parseJsonValue = (value) => typeof value === 'string' ? JSON.parse(value) : value;

export function createRepository(db) {
  return {
    async listBookings() {
      const result = await db.execute('SELECT id, contract_ref, status, data_json, created_at, updated_at FROM bookings ORDER BY updated_at DESC LIMIT 100');
      return result.rows.map((row) => ({ id: row.id, contractRef: row.contract_ref, status: row.status, ...parseJsonValue(row.data_json), createdAt: row.created_at, updatedAt: row.updated_at }));
    },
    async getBooking(id) {
      const result = await db.execute({ sql: 'SELECT id, contract_ref, status, data_json, created_at, updated_at FROM bookings WHERE id = ?', args: [id] });
      const row = result.rows[0];
      if (!row) return null;
      return { id: row.id, contractRef: row.contract_ref, status: row.status, ...parseJsonValue(row.data_json), createdAt: row.created_at, updatedAt: row.updated_at };
    },
    async saveBooking(data, id = data.id || randomUUID()) {
      const existing = await db.execute({ sql: 'SELECT id, contract_ref FROM bookings WHERE id = ?', args: [id] });
      const requestedRef = String(data.contractRef || '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 64);
      const contractRef = existing.rows[0]?.contract_ref || requestedRef || makeReference();
      const createdAt = existing.rows[0] ? undefined : now();
      const updatedAt = now();
      const clean = { ...data, id, contractRef, status: data.status || 'draft' };
      await db.execute({
        sql: `INSERT INTO bookings (id, contract_ref, status, data_json, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET status=excluded.status, data_json=excluded.data_json, updated_at=excluded.updated_at`,
        args: [id, contractRef, clean.status, JSON.stringify(clean), createdAt || updatedAt, updatedAt],
      });
      return this.getBooking(id);
    },
    async nextDocumentVersion(bookingId) {
      const result = await db.execute({ sql: 'SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM contract_documents WHERE booking_id = ?', args: [bookingId] });
      return Number(result.rows[0].next_version || 1);
    },
    async saveDocument({ bookingId, version, filename, bytes, snapshot }) {
      const id = randomUUID();
      await db.execute({
        sql: `INSERT INTO contract_documents
              (id, booking_id, version, filename, mime_type, file_bytes, template_version, policy_version, snapshot_json, created_at)
              VALUES (?, ?, ?, ?, 'application/pdf', ?, ?, ?, ?, ?)`,
        args: [id, bookingId, version, filename, bytes, HOTEL.templateVersion, HOTEL.policyVersion, JSON.stringify(snapshot), now()],
      });
      return { id, version, filename };
    },
    async getDocument(id) {
      const result = await db.execute({ sql: 'SELECT id, booking_id, version, filename, mime_type, file_bytes, created_at FROM contract_documents WHERE id = ?', args: [id] });
      const row = result.rows[0];
      return row ? { id: row.id, bookingId: row.booking_id, version: row.version, filename: row.filename, mimeType: row.mime_type, bytes: row.file_bytes, createdAt: row.created_at } : null;
    },
    async listDocuments(bookingId) {
      const result = await db.execute({ sql: 'SELECT id, version, filename, created_at FROM contract_documents WHERE booking_id = ? ORDER BY version DESC', args: [bookingId] });
      return result.rows.map((row) => ({ id: row.id, version: row.version, filename: row.filename, createdAt: row.created_at }));
    },
  };
}
