export function calculateFinancials(data) {
  const lineItems = (data.otherItems || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const subtotal = ['roomRate','venueRental','foodAndBeverage','decor','entertainment'].reduce((sum, key) => sum + Number(data[key] || 0), 0) + lineItems;
  const serviceCharge = Number(data.serviceCharge || 0);
  const taxes = Number(data.taxes || 0);
  const overtime = Number(data.overtimeRate || 0) * Number(data.overtimeHours || 0);
  const grandTotal = subtotal + serviceCharge + taxes + overtime;
  const depositAmount = grandTotal * Number(data.depositPercent || 0) / 100;
  return { subtotal, serviceCharge, taxes, overtime, grandTotal, depositAmount, balanceAmount: grandTotal - depositAmount };
}
