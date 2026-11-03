const form = document.querySelector('#booking-form');
const statusEl = document.querySelector('#status');
const bookingsEl = document.querySelector('#bookings');
let currentId = null;
const numberFields = new Set(['guestCount','venueRental','roomRate','foodAndBeverage','decor','entertainment','serviceCharge','taxes','depositPercent']);
function payloadFromForm() {
  const payload = Object.fromEntries(new FormData(form).entries());
  for (const field of numberFields) payload[field] = Number(payload[field] || 0);
  payload.warningAcknowledgements = [];
  if (currentId) payload.id = currentId;
  return payload;
}
async function request(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) throw new Error(`Unexpected response (${response.status}).`);
  const body = await response.json();
  if (!response.ok) { const details = body.issues?.map((x) => x.message || x.field).filter(Boolean).join('; '); throw new Error(details || body.error || `Request failed (${response.status}).`); }
  return body;
}
async function loadBookings() {
  const result = await request('/api/bookings', { method: 'GET' });
  bookingsEl.replaceChildren();
  for (const booking of result.bookings) {
    const item = document.createElement('li'); const button = document.createElement('button');
    button.type = 'button'; button.textContent = `${booking.clientName || 'New draft'} — ${booking.eventName || booking.contractRef}`;
    button.addEventListener('click', () => loadBooking(booking.id)); item.append(button); bookingsEl.append(item);
  }
}
async function loadBooking(id) {
  try { const result = await request(`/api/bookings/${id}`); currentId = id; form.reset(); for (const [key,value] of Object.entries(result.booking)) { const control = form.elements.namedItem(key); if (control && typeof value !== 'object' && value !== null) control.value = value; } statusEl.textContent = 'Draft loaded.'; }
  catch (error) { statusEl.textContent = error.message; }
}
document.querySelector('#save').addEventListener('click', async () => {
  statusEl.textContent = 'Saving draft…';
  try { const result = await request('/api/bookings', { method: 'POST', body: JSON.stringify(payloadFromForm()) }); currentId = result.booking.id; statusEl.textContent = 'Draft saved.'; await loadBookings(); }
  catch (error) { statusEl.textContent = `Save failed: ${error.message}`; }
});
document.querySelector('#generate').addEventListener('click', async () => {
  statusEl.textContent = 'Saving draft before PDF generation…';
  try {
    const saved = await request('/api/bookings', { method: 'POST', body: JSON.stringify(payloadFromForm()) }); currentId = saved.booking.id;
    const generated = await request(`/api/bookings/${currentId}/generate`, { method: 'POST', body: JSON.stringify(payloadFromForm()) });
    statusEl.textContent = 'PDF generated. Download starting…'; await loadBookings();
    const link = document.createElement('a'); link.href = generated.downloadUrl; link.download = generated.document.filename; document.body.append(link); link.click(); link.remove();
  } catch (error) { statusEl.textContent = `PDF generation failed: ${error.message}`; }
});
loadBookings().then(() => { statusEl.textContent = 'Ready.'; }).catch((error) => { statusEl.textContent = `API unavailable: ${error.message}`; });
