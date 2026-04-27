import type { BybitRestClient } from "../bybit/restClient.js";
import { assertOk } from "../bybit/restClient.js";
import type { PositionRow } from "../bybit/types.js";
import { config } from "../config.js";

export async function fetchUsdtEquity(client: BybitRestClient): Promise<number> {
  const raw = await client.privateGet("/v5/account/wallet-balance", {
    accountType: "UNIFIED",
    coin: "USDT",
  });
  assertOk(raw, "wallet-balance");
  const list = (raw as { result?: { list?: Record<string, unknown>[] } }).result?.list;
  const row = list?.[0];
  if (!row) return 0;
  if (row.totalEquity !== undefined) return Number(row.totalEquity);
  const coins = row.coin as Record<string, string>[] | undefined;
  const u = coins?.find((c) => String(c.coin).toUpperCase() === "USDT");
  if (u) return Number(u.equity ?? u.walletBalance ?? 0);
  return 0;
}

export type OpenPosition = {
  side: "Buy" | "Sell";
  size: number;
  avgPrice: number;
};

export async function fetchOpenPosition(client: BybitRestClient): Promise<OpenPosition | null> {
  const raw = await client.privateGet("/v5/position/list", {
    category: "linear",
    symbol: config.symbol,
  });
  assertOk(raw, "position/list");
  const list = (raw as { result?: { list?: PositionRow[] } }).result?.list ?? [];
  for (const p of list) {
    const size = Number(p.size);
    if (size > 0) {
      return {
        side: p.side === "Buy" ? "Buy" : "Sell",
        size,
        avgPrice: Number(p.avgPrice),
      };
    }
  }
  return null;
}
