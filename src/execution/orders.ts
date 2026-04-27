import type { BybitRestClient } from "../bybit/restClient.js";
import { assertOk } from "../bybit/restClient.js";
import { config } from "../config.js";
import type { LotRules } from "../market/instrument.js";
import { floorQty, roundPrice } from "../market/instrument.js";
import { randomUUID } from "node:crypto";

export function computeOrderQty(
  equityUsd: number,
  price: number,
  atr: number,
  rules: LotRules,
): number | null {
  if (price <= 0 || atr <= 0 || equityUsd <= 0) return null;
  const stopDist = atr * config.atrStopMult;
  if (stopDist <= 0) return null;
  const riskUsd = equityUsd * config.riskPerTrade;
  let qty = riskUsd / stopDist;
  qty = floorQty(qty, rules.qtyStep);
  if (qty < rules.minQty) return null;
  const capped = Math.min(qty, config.maxOrderQty, rules.maxQty);
  qty = floorQty(capped, rules.qtyStep);
  if (qty < rules.minQty) return null;
  return qty;
}

export async function placeMarket(
  client: BybitRestClient,
  side: "Buy" | "Sell",
  qty: number,
  reduceOnly: boolean,
): Promise<void> {
  const body: Record<string, unknown> = {
    category: "linear",
    symbol: config.symbol,
    side,
    positionIdx: 0,
    orderType: "Market",
    qty: String(qty),
    orderLinkId: randomUUID().replace(/-/g, "").slice(0, 32),
  };
  if (reduceOnly) body.reduceOnly = true;
  const raw = await client.privatePost("/v5/order/create", body);
  assertOk(raw, "order/create");
}

export async function setBrackets(
  client: BybitRestClient,
  side: "Buy" | "Sell",
  entry: number,
  atr: number,
  rules: LotRules,
): Promise<void> {
  const multStop = config.atrStopMult;
  const multTp = config.atrTpMult;
  let stopLoss: number;
  let takeProfit: number;
  if (side === "Buy") {
    stopLoss = entry - atr * multStop;
    takeProfit = entry + atr * multTp;
  } else {
    stopLoss = entry + atr * multStop;
    takeProfit = entry - atr * multTp;
  }
  const body = {
    category: "linear",
    symbol: config.symbol,
    positionIdx: 0,
    stopLoss: roundPrice(stopLoss, rules.tickSize),
    takeProfit: roundPrice(takeProfit, rules.tickSize),
    slTriggerBy: "LastPrice",
    tpTriggerBy: "LastPrice",
  };
  const raw = await client.privatePost("/v5/position/trading-stop", body);
  assertOk(raw, "position/trading-stop");
}
