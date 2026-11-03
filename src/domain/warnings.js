export function collectWarnings(data) {
  const warnings=[];
  if (!data.emailAddress) warnings.push({code:'missing-email',message:'Client email address is not provided.'});
  if (!data.finalPaymentDue) warnings.push({code:'missing-final-payment-date',message:'Final payment due date is not specified.'});
  return warnings;
}
