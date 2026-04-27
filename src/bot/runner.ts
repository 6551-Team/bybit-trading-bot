import { config, validateConfig } from "../config.js";
import { createClient } from "../bybit/restClient.js";
import { fetchLinearKlines } from "../market/klines.js";
import { fetchLotRules } from "../market/instrument.js";
import { evaluateTrendStrategy } from "../strategy/trendEmaAdx.js";
import {
  fetchOpenPosition,
  fetchUsdtEquity,
  type OpenPosition,
} from "../execution/account.js";
import {
  computeOrderQty,
  placeMarket,
  setBrackets,
} from "../execution/orders.js";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function logSnapshot(msg: string, extra?: Record<string, unknown>): void {
  const line = extra ? `${msg} ${JSON.stringify(extra)}` : msg;
  console.log(`[${new Date().toISOString()}] ${line}`);
}

async function refreshPosition(
  client: ReturnType<typeof createClient>,
): Promise<OpenPosition | null> {
  for (let a = 0; a < 6; a++) {
    await sleep(400);
    const p = await fetchOpenPosition(client);
    if (p) return p;
  }
  return null;
}

export async function runBot(): Promise<void> {
  validateConfig();
  logSnapshot("Starting Bybit trend bot (EMA + ADX + ATR risk).", {
    symbol: config.symbol,
    interval: config.interval,
    dryRun: config.dryRun,
    testnet: config.testnet,
  });

  const client = createClient();
  await client.syncServerTime();
  const lotRules = await fetchLotRules();
  logSnapshot("Instrument rules loaded.", { ...lotRules });

  const klineLimit = Math.max(250, config.slowEma + config.adxPeriod * 4 + 50);

  while (true) {
    try {
      const { high, low, close } = await fetchLinearKlines(klineLimit);
      const snap = evaluateTrendStrategy(high, low, close);
      if (!snap) {
        logSnapshot("Not enough data or indicators warming up; skipping tick.");
        await sleep(config.pollMs);
        continue;
      }

      const target =
        snap.signal === "long" ? "Buy" : snap.signal === "short" ? "Sell" : null;

      logSnapshot("Signal", {
        signal: snap.signal,
        close: snap.close,
        adx: Number(snap.adx.toFixed(2)),
        atr: Number(snap.atr.toFixed(4)),
      });

      if (config.dryRun) {
        let equity = 0;
        if (config.apiKey && config.apiSecret) {
          try {
            await client.syncServerTime();
            equity = await fetchUsdtEquity(client);
          } catch (e) {
            logSnapshot("DRY_RUN: account read failed", {
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }
        const qty =
          equity > 0
            ? computeOrderQty(equity, snap.close, snap.atr, lotRules)
            : null;
        logSnapshot("DRY_RUN (no orders)", {
          target,
          qty,
          equityUsd: equity || null,
        });
        await sleep(config.pollMs);
        continue;
      }

      const pos = await fetchOpenPosition(client);
      const equity = await fetchUsdtEquity(client);
      const qty = computeOrderQty(equity, snap.close, snap.atr, lotRules);

      if (target === null) {
        await sleep(config.pollMs);
        continue;
      }

      if (!qty) {
        logSnapshot("Qty below exchange minimum or risk sizing failed; skip.");
        await sleep(config.pollMs);
        continue;
      }

      if (!pos) {
        await placeMarket(client, target, qty, false);
        const opened = await refreshPosition(client);
        const entry = opened?.avgPrice ?? snap.close;
        const side = opened?.side ?? target;
        await setBrackets(client, side, entry, snap.atr, lotRules);
        logSnapshot("Opened position.", { side, qty: String(qty), entry });
      } else if (pos.side !== target) {
        await placeMarket(client, pos.side === "Buy" ? "Sell" : "Buy", pos.size, true);
        await sleep(500);
        await placeMarket(client, target, qty, false);
        const opened = await refreshPosition(client);
        const entry = opened?.avgPrice ?? snap.close;
        await setBrackets(client, target, entry, snap.atr, lotRules);
        logSnapshot("Flipped position.", { to: target, qty: String(qty) });
      }
    } catch (e) {
      logSnapshot("Tick error", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
    await sleep(config.pollMs);
  }
}
