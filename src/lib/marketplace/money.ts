export function minorToMajor(amountMinor: number) {
  return amountMinor / 100;
}

export function formatMoneyMinor(
  amountMinor: number,
  currencySymbol = "$",
) {
  return `${currencySymbol}${minorToMajor(amountMinor).toFixed(0)}`;
}