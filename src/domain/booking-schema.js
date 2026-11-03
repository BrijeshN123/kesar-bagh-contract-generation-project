import { z } from 'zod';

const optionalText = z.string().max(10000).optional().default('');
const money = z.coerce.number().finite().min(0).default(0);
const lineItem = z.object({ id: optionalText, label: optionalText, amount: money, notes: optionalText });
const paymentItem = z.object({ label: optionalText, amount: money, dueDate: optionalText });

export const bookingSchema = z.object({
  id: z.string().optional(), contractRef: z.string().optional(), status: z.string().optional(),
  clientName: optionalText, firstName: optionalText, lastName: optionalText, mailingAddress: optionalText,
  contactNumber: optionalText, emailAddress: z.string().optional().default(''),
  eventName: optionalText, eventType: optionalText, eventDate: optionalText, eventEndDate: optionalText,
  guestCount: z.coerce.number().int().min(0).default(0), roomCount: z.coerce.number().int().min(0).default(0),
  eventStartTime: optionalText, eventEndTime: optionalText, eventDetails: optionalText,
  accommodation: optionalText, roomNights: z.coerce.number().min(0).default(0),
  roomRate: money, venueRental: money, foodAndBeverage: money, decor: money, entertainment: money,
  taxes: money, serviceCharge: money, overtimeRate: money, overtimeHours: z.coerce.number().min(0).default(0),
  otherItems: z.array(lineItem).default([]), paymentSchedule: z.array(paymentItem).default([]),
  depositPercent: z.coerce.number().min(0).max(100).default(50), finalPaymentDue: optionalText,
  specialConditions: optionalText, notes: optionalText, warningAcknowledgements: z.array(z.string()).default([]),
}).passthrough();

export function parseDraft(value) { return bookingSchema.safeParse(value); }
export function parseForGeneration(value) { return bookingSchema.safeParse(value); }
