import { createServer as createHttpServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './db/client.js';
import { createRepository } from './db/repository.js';
import { parseDraft, parseForGeneration } from './domain/booking-schema.js';
import { calculateFinancials } from './domain/financials.js';
import { collectWarnings } from './domain/warnings.js';
import { validateBookingMinimums, validateBuyout, validatePaymentSchedule } from './domain/rules.js';
import import { generateContractPdf } from './pdf/generate-contract.js';

const ROOT = resolve(process.cwd());
const PUBLIC = resolve(ROOT, 'public');
const LOGO_PATH = resolve(PUBLIC, 'assets/kesar-bagh-logo.png');
const MAX_BODY_BYTES = 262_144;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

async function readJson(request) {
  const chunks = []; let length = 0;
  for await (const chunk of request) { length += chunk.length; if (length > MAX_BODY_BYTES) throw Object.assign(new Error('Request body is too large.'), { status: 413 }); chunks.push(chunk); }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 }); }
}
function json(response, status, body) { response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); response.end(JSON.stringify(body)); }
function securityHeaders() { return { 'x-content-type-options': 'nosniff', 'x-frame-options': 'SAMEORIGIN', 'referrer-policy': 'no-referrer', 'content-security-policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'" }; }
async function serveStatic(pathname, response) {
  const requestPath = pathname === '/' ? '/index.html' : pathname;
  let decoded; try { decoded = decodeURIComponent(requestPath); } catch { return json(response, 400, { error: 'Invalid path' }); }
  const filePath = resolve(PUBLIC, `.${decoded}`);
  if (filePath !== PUBLIC && !filePath.startsWith(PUBLIC + sep)) return json(response, 403, { error: 'Forbidden' });
  let details; try { details = await stat(filePath); } catch { return json(response, 404, { error: 'Not found' }); }
  if (!details.isFile()) return json(response, 404, { error: 'Not found' });
  const bytes = await readFile(filePath);
  response.writeHead(200, { ...securityHeaders(), 'content-type': MIME[extname(filePath)] || 'application/octet-stream', 'content-length': bytes.length, 'cache-control': extname(filePath) === '.html' ? 'no-store' : 'public, max-age=3600' }); response.end(bytes);
}

export async function createAppServer({ database = null, repository = null } = {}) {
  const ownsDatabase = !database && !repository;
  const db = database || (repository ? null : await openDatabase());
  const repo = repository || createRepository(db);
  let logoBytes = null; try { logoBytes = await readFile(LOGO_PATH); } catch { /* optional logo */ }
  const server = createHttpServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`); const path = url.pathname;
      if (request.method === 'GET' && path === '/api/health') return json(response, 200, { status: 'ok', database: 'connected', pdfEngine: 'pdf-lib' });
      if (request.method === 'GET' && path === '/api/bookings') return json(response, 200, { bookings: await repo.listBookings() });
      if (request.method === 'POST' && path === '/api/bookings') {
        const payload = await readJson(request); const parsed = parseDraft(payload);
        if (!parsed.success) return json(response, 422, { error: 'Validation failed', issues: parsed.error.issues });
        return json(response, 201, { booking: await repo.saveBooking(parsed.data, payload.id) });
      }
      const bookingMatch = path.match(/^\/api\/bookings\/([a-f0-9-]+)$/i);
      if (bookingMatch && request.method === 'GET') { const booking = await repo.getBooking(bookingMatch[1]); if (!booking) return json(response, 404, { error: 'Booking not found.' }); return json(response, 200, { booking, documents: await repo.listDocuments(booking.id) }); }
      if (bookingMatch && request.method === 'PUT') {
        const current = await repo.getBooking(bookingMatch[1]); if (!current) return json(response, 404, { error: 'Booking not found.' });
        const payload = await readJson(request); const parsed = parseDraft({ ...payload, id: current.id, contractRef: current.contractRef });
        if (!parsed.success) return json(response, 422, { error: 'Validation failed', issues: parsed.error.issues });
        return json(response, 200, { booking: await repo.saveBooking(parsed.data, current.id) });
      }
      const generateMatch = path.match(/^\/api\/bookings\/([a-f0-9-]+)\/generate$/i);
      if (generateMatch && request.method === 'POST') {
        const booking = await repo.getBooking(generateMatch[1]); if (!booking) return json(response, 404, { error: 'Booking not found.' });
        const payload = await readJson(request); const parsed = parseForGeneration({ ...booking, ...payload, id: booking.id, contractRef: booking.contractRef });
        if (!parsed.success) return json(response, 422, { error: 'Complete the required fields before generating.', issues: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })) });
        const data = parsed.data; const financials = calculateFinancials(data); const issues = [...validateBookingMinimums(data), ...validateBuyout(data)];
        const schedule = data.paymentSchedule?.length ? data.paymentSchedule : [ { label: `Non-refundable confirmation deposit (${data.depositPercent}%)`, amount: financials.depositAmount, dueDate: '' }, ...(financials.balanceAmount > 0 ? [{ label: 'Final balance', amount: financials.balanceAmount, dueDate: data.finalPaymentDue || '' }] : []) ];
        issues.push(...validatePaymentSchedule(schedule, financials.grandTotal, financials.depositAmount));
        if (issues.length) return json(response, 422, { error: 'Resolve the blocking items before generation.', issues });
        const warnings = collectWarnings(data); const acknowledged = new Set(data.warningAcknowledgements || []); const unresolved = warnings.filter((warning) => !acknowledged.has(warning.code));
        if (unresolved.length) return json(response, 409, { error: 'Review and acknowledge all warnings before generating.', requiresAcknowledgement: true, warnings });
        const snapshot = { ...data, paymentSchedule: schedule, financials, templateVersion: 'KBP-BUYOUT-1.0-draft', policyVersion: 'SOURCE-AGREEMENT-2026-10-28-REVIEW' };
        const pdfBytes = await generateContractPdf(snapshot, financials, logoBytes); const version = await repo.nextDocumentVersion(booking.id); const filename = `${booking.contractRef}-v${version}.pdf`;
        const document = await repo.saveDocument({ bookingId: booking.id, version, filename, bytes: pdfBytes, snapshot });
        await repo.saveBooking({ ...data, paymentSchedule: schedule, id: booking.id, contractRef: booking.contractRef, status: 'generated', currentDocumentId: document.id, warningAcknowledgements: [...acknowledged] }, booking.id);
        return json(response, 201, { document, financials, warnings, downloadUrl: `/api/documents/${document.id}` });
      }
      const docMatch = path.match(/^\/api\/documents\/([a-f0-9-]+)$/i);
      if (docMatch && request.method === 'GET') { const document = await repo.getDocument(docMatch[1]); if (!document) return json(response, 404, { error: 'Document not found.' }); response.writeHead(200, { ...securityHeaders(), 'content-type': document.mimeType, 'content-length': document.bytes.length, 'content-disposition': `attachment; filename="${document.filename}"`, 'cache-control': 'private, no-store' }); return response.end(Buffer.from(document.bytes)); }
      if (request.method === 'GET' || request.method === 'HEAD') return serveStatic(path, response);
      return json(response, 405, { error: 'Method not allowed.' });
    } catch (error) { console.error('[request]', error?.stack || error?.message || 'Unexpected error'); return json(response, error.status || 500, { error: error.status ? error.message : 'Unexpected server error. Your draft has not been deleted.' }); }
  });
  if (ownsDatabase) server.on('close', () => db.close()); return server;
}
async function loadDotEnv() {
  try { const contents = await readFile(resolve(process.cwd(), '.env'), 'utf8'); for (const rawLine of contents.split(/\r?\n/)) { const line = rawLine.trim(); if (!line || line.startsWith('#')) continue; const separator = line.indexOf('='); if (separator < 1) continue; const key = line.slice(0, separator).trim(); const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, ''); if (process.env[key] === undefined) process.env[key] = value; } } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) { await loadDotEnv(); const app = await createAppServer(); const host = process.env.HOST || '127.0.0.1'; const port = Number(process.env.PORT || 3000); app.listen(port, host, () => { console.log(`Kesar Bagh Contract Studio running at http://${host}:${port}`); if (host !== '127.0.0.1' && host !== '::1') console.warn('No authentication is enabled. Expose this service only behind a private network/VPN and network access controls.'); }); }
