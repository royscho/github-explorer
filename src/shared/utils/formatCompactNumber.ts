const UNITS: ReadonlyArray<readonly [number, string]> = [
  [1_000_000_000, 'b'],
  [1_000_000, 'm'],
  [1_000, 'k'],
];

export function formatCompactNumber(value: number): string {
  const abs = Math.abs(value);

  if (abs < 1000) {
    return String(value);
  }

  for (let i = 0; i < UNITS.length; i += 1) {
    const [threshold] = UNITS[i];
    if (abs < threshold) {
      continue;
    }

    let unitIndex = i;
    let rounded = roundToOneDecimal(value / UNITS[unitIndex][0]);
    // Rounding can push the value up to the next unit (e.g. 999_950 -> "1000k" instead of "1m").
    while (Math.abs(rounded) >= 1000 && unitIndex > 0) {
      unitIndex -= 1;
      rounded = roundToOneDecimal(value / UNITS[unitIndex][0]);
    }
    return `${trimTrailingZero(rounded)}${UNITS[unitIndex][1]}`;
  }

  return String(value);
}

function roundToOneDecimal(n: number): number {
  return Math.round(n * 10) / 10;
}

function trimTrailingZero(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
