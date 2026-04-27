/**
 * Wilder smoothing for TR / DM: first value = sum(x[0]..x[period-1]); then
 * out[i] = out[i-1] - out[i-1]/period + x[i]
 */
function wilderSumSeries(x: number[], period: number): number[] {
  const n = x.length;
  const out: number[] = new Array(n).fill(NaN);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += x[i];
    if (i === period - 1) {
      out[i] = sum;
    } else if (i >= period) {
      const prev = out[i - 1];
      if (!Number.isFinite(prev)) continue;
      out[i] = prev - prev / period + x[i];
    }
  }
  return out;
}

/**
 * ADX, +DI, -DI. First ADX = SMA of first `period` DX values; then Wilder RMA.
 */
export function adxSeries(
  high: number[],
  low: number[],
  close: number[],
  period: number,
): { adx: number[]; plusDi: number[]; minusDi: number[] } {
  const n = close.length;
  const tr: number[] = new Array(n);
  const plusDm: number[] = new Array(n).fill(0);
  const minusDm: number[] = new Array(n).fill(0);

  tr[0] = high[0] - low[0];
  for (let i = 1; i < n; i++) {
    const upMove = high[i] - high[i - 1];
    const downMove = low[i - 1] - low[i];
    if (upMove > downMove && upMove > 0) plusDm[i] = upMove;
    if (downMove > upMove && downMove > 0) minusDm[i] = downMove;
    const hl = high[i] - low[i];
    const hc = Math.abs(high[i] - close[i - 1]);
    const lc = Math.abs(low[i] - close[i - 1]);
    tr[i] = Math.max(hl, hc, lc);
  }

  const tr14 = wilderSumSeries(tr, period);
  const plusDm14 = wilderSumSeries(plusDm, period);
  const minusDm14 = wilderSumSeries(minusDm, period);

  const plusDi: number[] = new Array(n).fill(NaN);
  const minusDi: number[] = new Array(n).fill(NaN);
  const dx: number[] = new Array(n).fill(NaN);

  for (let i = period - 1; i < n; i++) {
    const t = tr14[i];
    if (!Number.isFinite(t) || t === 0) continue;
    const pdi = (100 * plusDm14[i]) / t;
    const mdi = (100 * minusDm14[i]) / t;
    plusDi[i] = pdi;
    minusDi[i] = mdi;
    const denom = pdi + mdi;
    dx[i] = denom === 0 ? 0 : (100 * Math.abs(pdi - mdi)) / denom;
  }

  const adx: number[] = new Array(n).fill(NaN);
  const dx0 = period - 1;
  const firstAdxIdx = dx0 + period - 1;
  if (firstAdxIdx < n) {
    let s = 0;
    for (let k = 0; k < period; k++) {
      s += dx[dx0 + k];
    }
    adx[firstAdxIdx] = s / period;
    for (let i = firstAdxIdx + 1; i < n; i++) {
      const prev = adx[i - 1];
      if (!Number.isFinite(prev)) break;
      adx[i] = (prev * (period - 1) + dx[i]) / period;
    }
  }

  return { adx, plusDi, minusDi };
}
