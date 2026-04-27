import { config } from "../config.js";
import { hmacSignHex, sortedQueryString } from "./sign.js";
import type { BybitRetCode } from "./types.js";

const RECV_WINDOW = "5000";

export class BybitRestClient {
  private timeOffsetMs = 0;

  constructor(
    private readonly apiKey: string,
    private readonly apiSecret: string,
    private readonly baseUrl: string,
  ) {}

  async syncServerTime(): Promise<void> {
    const j = await this.publicGet("/v5/market/time", {});
    const t = (j as { time?: number }).time;
    if (typeof t === "number") {
      this.timeOffsetMs = t - Date.now();
    }
  }

  private ts(): string {
    return String(Date.now() + this.timeOffsetMs);
  }

  async publicGet(path: string, params: Record<string, string | number>): Promise<unknown> {
    const qs = sortedQueryString(
      Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    );
    const url = `${this.baseUrl}${path}?${qs}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Bybit HTTP ${res.status} ${path}`);
    return res.json() as Promise<unknown>;
  }

  async privateGet(path: string, params: Record<string, string | number>): Promise<unknown> {
    const qs = sortedQueryString(
      Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    );
    const timestamp = this.ts();
    const signPayload = timestamp + this.apiKey + RECV_WINDOW + qs;
    const sign = hmacSignHex(this.apiSecret, signPayload);
    const url = `${this.baseUrl}${path}?${qs}`;
    const res = await fetch(url, {
      headers: {
        "X-BAPI-API-KEY": this.apiKey,
        "X-BAPI-SIGN": sign,
        "X-BAPI-SIGN-TYPE": "2",
        "X-BAPI-TIMESTAMP": timestamp,
        "X-BAPI-RECV-WINDOW": RECV_WINDOW,
      },
    });
    if (!res.ok) throw new Error(`Bybit HTTP ${res.status} ${path}`);
    return res.json() as Promise<unknown>;
  }

  async privatePost(path: string, body: Record<string, unknown>): Promise<unknown> {
    const timestamp = this.ts();
    const jsonBody = JSON.stringify(body);
    const signPayload = timestamp + this.apiKey + RECV_WINDOW + jsonBody;
    const sign = hmacSignHex(this.apiSecret, signPayload);
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-BAPI-API-KEY": this.apiKey,
        "X-BAPI-SIGN": sign,
        "X-BAPI-SIGN-TYPE": "2",
        "X-BAPI-TIMESTAMP": timestamp,
        "X-BAPI-RECV-WINDOW": RECV_WINDOW,
      },
      body: jsonBody,
    });
    if (!res.ok) throw new Error(`Bybit HTTP ${res.status} ${path}`);
    return res.json() as Promise<unknown>;
  }
}

export function assertOk(data: unknown, ctx: string): void {
  const b = data as BybitRetCode;
  if (b.retCode !== 0) {
    throw new Error(`${ctx}: ${b.retCode} ${b.retMsg}`);
  }
}

export function createClient(): BybitRestClient {
  return new BybitRestClient(config.apiKey, config.apiSecret, config.baseUrl);
}
