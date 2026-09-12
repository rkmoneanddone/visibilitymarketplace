export function minorToMajor(amountMinor: number) {
  return amountMinor / 100;
}

export function isIndianViewer() {
  if (typeof navigator === "undefined") {
    return true;
  }

  const locales = [
    navigator.language,
    ...(navigator.languages || []),
  ]
    .filter(Boolean)
    .map((value) => value.toLowerCase());

  if (locales.some((value) => /-in(?:-|$)/.test(value))) {
    return true;
  }

  try {
    const timeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone;

    return (
      timeZone === "Asia/Kolkata" ||
      timeZone === "Asia/Calcutta"
    );
  } catch {
    return false;
  }
}

function trimZeros(value: string) {
  return value
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1");
}

/**
 * ViewBid's base pricing is INR. For customer-facing UI we use the fixed
 * product display mapping approved for V1: Rs 100 = US$1. This is not a live
 * FX quote; Dodo remains authoritative for the actual checkout currency.
 */
export function formatInrBaseMinorForViewer(
  amountMinor: number,
) {
  if (isIndianViewer()) {
    return `₹${trimZeros(
      (amountMinor / 100).toFixed(2),
    )}`;
  }

  return `$${(amountMinor / 10_000).toFixed(2)}`;
}

export function viewerMajorToInrMinor(
  value: string,
): number | null {
  const normalized = value.trim();

  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const multiplier = isIndianViewer()
    ? 100
    : 10_000;

  const minor = Math.round(parsed * multiplier);

  return Number.isSafeInteger(minor)
    ? minor
    : null;
}

export function inrMinorToViewerInput(
  amountMinor: number,
) {
  if (isIndianViewer()) {
    return trimZeros(
      (amountMinor / 100).toFixed(2),
    );
  }

  return trimZeros(
    (amountMinor / 10_000).toFixed(2),
  );
}

export function viewerCurrencySymbol() {
  return isIndianViewer() ? "₹" : "$";
}

function getCurrencySymbol(currency: string) {
  switch (currency.toUpperCase()) {
    case "USD":
      return "$";
    case "INR":
      return "₹";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    default:
      return currency;
  }
}

export function formatMoneyMinor(
  amountMinor: number,
  currency = "INR",
) {
  if (currency.toUpperCase() === "INR") {
    return formatInrBaseMinorForViewer(amountMinor);
  }

  const prefix = currency.length === 1
    ? currency
    : getCurrencySymbol(currency);

  return `${prefix}${trimZeros(
    minorToMajor(amountMinor).toFixed(2),
  )}`;
}
