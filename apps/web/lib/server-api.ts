import { NextResponse } from "next/server";
import { API_INTERNAL_URL } from "@/lib/site";
import type { Envelope, User } from "@/lib/types";

export class UpstreamError extends Error {
  constructor() {
    super("upstream unavailable");
    this.name = "UpstreamError";
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data, error: null, request_id: "req_web" }, { status });
}

export function fail(status: number, code: string, message: string) {
  return NextResponse.json(
    { success: false, data: null, error: { code, message }, request_id: "req_web" },
    { status },
  );
}

export async function currentUser(request: Request): Promise<User | null> {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  let res: Response;
  try {
    res = await fetch(`${API_INTERNAL_URL}/v1/users/me`, {
      headers: { cookie, accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new UpstreamError();
  }
  if (res.status === 401) return null;
  const payload = (await res.json()) as Envelope<User>;
  if (!payload.success || !payload.data?.authenticated) return null;
  return payload.data;
}

export async function applyBillingEvent(event: unknown): Promise<{ ok: boolean; status: number }> {
  const headers: Record<string, string> = { "content-type": "application/json", accept: "application/json" };
  const secret = process.env.BILLING_WEBHOOK_SECRET || "";
  if (secret) headers["x-sitepulse-webhook"] = secret;
  const res = await fetch(`${API_INTERNAL_URL}/v1/webhooks/waffo`, {
    method: "POST",
    headers,
    body: JSON.stringify(event),
    cache: "no-store",
  });
  return { ok: res.ok, status: res.status };
}
