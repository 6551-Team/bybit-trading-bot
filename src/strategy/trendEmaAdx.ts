import { adxSeries } from "../indicators/adx.js";
import { atrSeries } from "../indicators/atr.js";
import { emaSeries } from "../indicators/ema.js";
import { config } from "../config.js";

export type TrendSignal = "long" | "short" | "flat";

export type StrategySnapshot = {
  signal: TrendSignal;
  close: number;
  fastEma: number;
  slowEma: number;
  adx: number;
  plusDi: number;
  minusDi: number;
  atr: number;
};

export function evaluateTrendStrategy(
  high: number[],
  low: number[],
  close: number[],
): StrategySnapshot | null {
  const need =
    config.slowEma + config.adxPeriod * 3 + 10; // buffer for ADX warmup
  if (close.length < need) return null;

  const fast = emaSeries(close, config.fastEma);
  const slow = emaSeries(close, config.slowEma);
  const { adx, plusDi, minusDi } = adxSeries(high, low, close, config.adxPeriod);
  const atr = atrSeries(high, low, close, config.atrPeriod);

  const i = close.length - 1;
  const f = fast[i];
  const sl = slow[i];
  const a = adx[i];
  const pdi = plusDi[i];
  const mdi = minusDi[i];
  const at = atr[i];

  if (
    !Number.isFinite(f) ||
    !Number.isFinite(sl) ||
    !Number.isFinite(a) ||
    !Number.isFinite(pdi) ||
    !Number.isFinite(mdi) ||
    !Number.isFinite(at)
  ) {
    return null;
  }

  let signal: TrendSignal = "flat";
  if (f > sl && a >= config.adxMin && pdi > mdi) signal = "long";
  else if (f < sl && a >= config.adxMin && mdi > pdi) signal = "short";

  return {
    signal,
    close: close[i],
    fastEma: f,
    slowEma: sl,
    adx: a,
    plusDi: pdi,
    minusDi: mdi,
    atr: at,
  };
}
