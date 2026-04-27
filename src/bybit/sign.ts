import { createHmac } from "node:crypto";

export function hmacSignHex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Sorted query string key=value&... for GET signing */
export function sortedQueryString(params: Record<string, string | number | boolean>): string {
  const keys = Object.keys(params).sort();
  return keys.map((k) => `${k}=${params[k]}`).join("&");
}
