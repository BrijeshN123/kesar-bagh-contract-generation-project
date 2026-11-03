import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { generateContractPdf } from './generate-contract.js';
import { calculateFinancials } from '../domain/financials.js';

test('contract generator returns a parseable PDF document', async () => {
  const data={clientName:'Test Client',eventName:'Test Event',eventDate:'2027-01-01',contractRef:'KBP-TEST',depositPercent:50};
  const pdfBytes=await generateContractPdf(data,calculateFinancials(data));
  const pdf=await PDFDocument.load(pdfBytes);
  assert.equal(pdf.getPageCount(),1);
  assert.ok(pdfBytes.byteLength>500);
});
