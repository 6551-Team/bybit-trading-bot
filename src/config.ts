import "dotenv/config";

function envString(key: string, fallback: string): string {
  const v = process.env[key];
  return v !== undefined && v !== "" ? v : fallback;
}

function envBool(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

function envNumber(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

const bybitTestnet = envBool("BYBIT_TESTNET", true);

export const config = {
  apiKey: envString("BYBIT_API_KEY", ""),
  apiSecret: envString("BYBIT_API_SECRET", ""),
  testnet: bybitTestnet,
  dryRun: envBool("DRY_RUN", true),

  symbol: envString("SYMBOL", "BTCUSDT").toUpperCase(),
  interval: envString("INTERVAL", "15"),

  fastEma: envNumber("FAST_EMA", 12),
  slowEma: envNumber("SLOW_EMA", 26),
  adxPeriod: Math.max(2, Math.floor(envNumber("ADX_PERIOD", 14))),
  adxMin: envNumber("ADX_MIN", 22),

  atrPeriod: Math.max(2, Math.floor(envNumber("ATR_PERIOD", 14))),
  atrStopMult: envNumber("ATR_STOP_MULT", 1.75),
  atrTpMult: envNumber("ATR_TP_MULT", 3.5),

  riskPerTrade: envNumber("RISK_PER_TRADE", 0.005),
  maxOrderQty: envNumber("MAX_ORDER_QTY", 0.001),

  pollMs: Math.max(5000, Math.floor(envNumber("POLL_MS", 60_000))),

  baseUrl: bybitTestnet
    ? "https://api-testnet.bybit.com"
    : "https://api.bybit.com",
} as const;

export function validateConfig(): void {
  if (!config.dryRun && (!config.apiKey || !config.apiSecret)) {
    throw new Error("Set BYBIT_API_KEY and BYBIT_API_SECRET, or enable DRY_RUN=true");
  }
  if (config.fastEma >= config.slowEma) {
    throw new Error("FAST_EMA must be less than SLOW_EMA");
  }
}
