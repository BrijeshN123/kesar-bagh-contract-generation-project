import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function generateContractPdf(data, financials, logoBytes = null) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 790;
  const draw = (text, size = 10, isBold = false) => { page.drawText(String(text ?? '').slice(0, 180), { x: 48, y, size, font: isBold ? bold : font, color: rgb(0.12,0.16,0.14), maxWidth: 500 }); y -= size + 9; };
  draw('KESAR BAGH PALACE', 18, true); draw('EVENT / BUYOUT AGREEMENT', 13, true); y -= 8;
  draw(`Contract reference: ${data.contractRef || 'Draft'}`); draw(`Client: ${data.clientName || ''}`); draw(`Contact: ${data.contactNumber || ''} | ${data.emailAddress || ''}`);
  draw(`Event: ${data.eventName || ''}`); draw(`Event type: ${data.eventType || ''}`); draw(`Dates: ${data.eventDate || ''} to ${data.eventEndDate || data.eventDate || ''}`); draw(`Guests: ${data.guestCount || 0}`); y -= 12;
  draw('COMMERCIAL SUMMARY', 12, true);
  for (const [label,key] of [['Room charges','roomRate'],['Venue rental','venueRental'],['Food & beverage','foodAndBeverage'],['Decor','decor'],['Entertainment','entertainment']]) draw(`${label}: INR ${Number(data[key]||0).toLocaleString('en-IN')}`);
  draw(`Other items: INR ${(data.otherItems||[]).reduce((s,x)=>s+Number(x.amount||0),0).toLocaleString('en-IN')}`);
  draw(`Service charge: INR ${Number(financials.serviceCharge||0).toLocaleString('en-IN')}`); draw(`Taxes: INR ${Number(financials.taxes||0).toLocaleString('en-IN')}`);
  draw(`Grand total: INR ${Number(financials.grandTotal||0).toLocaleString('en-IN')}`, 12, true);
  draw(`Deposit: INR ${Number(financials.depositAmount||0).toLocaleString('en-IN')}`); draw(`Balance: INR ${Number(financials.balanceAmount||0).toLocaleString('en-IN')}`); y -= 12;
  draw('SPECIAL CONDITIONS', 12, true); const conditions = String(data.specialConditions||'').split(/\r?\n/); for (const line of conditions) { if (y < 70) { const next=pdf.addPage([595.28,841.89]); y=790; } draw(line); }
  y -= 10; draw('This document is a draft for review and subject to approval by the parties.', 9);
  draw('Client signature: __________________________    Date: ______________', 9);
  draw('Hotel representative: _______________________    Date: ______________', 9);
  return Buffer.from(await pdf.save());
}
