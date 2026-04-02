export const getCurrencySymbol = (currency: string): string => {
  switch (currency?.toLowerCase()) {
    case 'usd':
      return '$';
    case 'inr':
      return '₹';
    default:
      return '$';
  }
};

export const formatAmount = (amount: number, currency: string): string => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toFixed(2)}`;
};
