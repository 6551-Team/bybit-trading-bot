/** Wilder / standard EMA: alpha = 2 / (period + 1) */
export function emaSeries(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const alpha = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0];
  out.push(prev);
  for (let i = 1; i < values.length; i++) {
    prev = alpha * values[i] + (1 - alpha) * prev;
    out.push(prev);
  }
  return out;
}
