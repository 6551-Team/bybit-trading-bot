import { createClient, assertOk } from "../bybit/restClient.js";
import { config } from "../config.js";
export type LotRules = {
  qtyStep: number;
  minQty: number;
  maxQty: number;
  tickSize: number;
};

export async function fetchLotRules(): Promise<LotRules> {
  const client = createClient();
  const raw = await client.publicGet("/v5/market/instruments-info", {
    category: "linear",
    symbol: config.symbol,
  });
  assertOk(raw, "instruments-info");
  const list = (raw as { result?: { list?: Record<string, unknown>[] } }).result?.list;
  const row = list?.[0];
  if (!row) {
    return {
      qtyStep: 0.001,
      minQty: 0.001,
      maxQty: 100,
      tickSize: 0.5,
    };
  }
  const lf = row.lotSizeFilter as Record<string, string> | undefined;
  const pf = row.priceFilter as Record<string, string> | undefined;
  return {
    qtyStep: Number(lf?.qtyStep ?? "0.001"),
    minQty: Number(lf?.minOrderQty ?? "0.001"),
    maxQty: Number(lf?.maxOrderQty ?? "100"),
    tickSize: Number(pf?.tickSize ?? "0.5"),
  };
}

export function floorQty(qty: number, step: number): number {
  if (step <= 0) return qty;
  const n = Math.floor(qty / step + 1e-12) * step;
  return Number(n.toFixed(12));
}

export function roundPrice(price: number, tick: number): string {
  if (tick <= 0) return String(price);
  const rounded = Math.round(price / tick) * tick;
  const decimals = Math.max(0, (tick.toString().split(".")[1] ?? "").length);
  return rounded.toFixed(decimals);
}
