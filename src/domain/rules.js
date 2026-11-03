export function validateBookingMinimums(data) {
  const issues = [];
  for (const [key, label] of [['clientName','Client name'],['eventName','Event name'],['eventDate','Event date']]) if (!String(data[key] || '').trim()) issues.push({ field:key, message:`${label} is required.` });
  return issues;
}
export function validateBuyout(data) {
  const issues=[];
  if (Number(data.guestCount || 0) < 0) issues.push({field:'guestCount',message:'Guest count cannot be negative.'});
  return issues;
}
export function validatePaymentSchedule(schedule, total, deposit) {
  const issues=[];
  const sum=(schedule||[]).reduce((n,item)=>n+Number(item.amount||0),0);
  if (Math.abs(sum-total)>0.01) issues.push({field:'paymentSchedule',message:'Payment schedule must equal the contract total.'});
  if ((schedule||[]).length && Number(schedule[0].amount||0)+0.01 < deposit) issues.push({field:'paymentSchedule',message:'The first payment must cover the required deposit.'});
  return issues;
}
