export function minorToMajor(amountMinor: number) {
  return amountMinor / 100;
}

function getCurrencySymbol(currency: string) {
  switch (currency.toUpperCase()) {
    case "USD":
      return "$";
    case "INR":
      return "\u20B9";
    case "EUR":
      return "\u20AC";
    case "GBP":
      return "\u00A3";
    default:
      return currency;
  }
}

export function formatMoneyMinor(
  amountMinor: number,
  currency = "USD",
) {
  const prefix =
    currency.length === 1
      ? currency
      : getCurrencySymbol(currency);

  return `${prefix}${minorToMajor(
    amountMinor,
  ).toFixed(0)} `;
}