/** ATR (Wilder smoothing), period >= 1 */
export function atrSeries(
  high: number[],
  low: number[],
  close: number[],
  period: number,
): number[] {
  const n = close.length;
  if (n === 0) return [];
  const tr: number[] = new Array(n);
  tr[0] = high[0] - low[0];
  for (let i = 1; i < n; i++) {
    const hl = high[i] - low[i];
    const hc = Math.abs(high[i] - close[i - 1]);
    const lc = Math.abs(low[i] - close[i - 1]);
    tr[i] = Math.max(hl, hc, lc);
  }
  const out: number[] = new Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += tr[i];
    if (i === period - 1) {
      out[i] = sum / period;
    } else if (i >= period) {
      out[i] = (out[i - 1] * (period - 1) + tr[i]) / period;
    } else {
      out[i] = NaN;
    }
  }
  return out;
}
