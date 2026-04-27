import { createClient, assertOk } from "../bybit/restClient.js";
import { config } from "../config.js";
import type { BybitRetCode } from "../bybit/types.js";

type KlineResult = {
  list: string[][];
};

export async function fetchLinearKlines(
  limit: number,
): Promise<{ high: number[]; low: number[]; close: number[] }> {
  const client = createClient();
  const raw = await client.publicGet("/v5/market/kline", {
    category: "linear",
    symbol: config.symbol,
    interval: config.interval,
    limit,
  });
  assertOk(raw, "kline");
  const result = (raw as BybitRetCode).result as KlineResult;
  const rows = (result.list ?? []) as string[][];
  // Bybit returns newest first; reverse to chronological
  const chronological = rows.slice().reverse();
  const high: number[] = [];
  const low: number[] = [];
  const close: number[] = [];
  for (const r of chronological) {
    high.push(Number(r[2]));
    low.push(Number(r[3]));
    close.push(Number(r[4]));
  }
  return { high, low, close };
}
