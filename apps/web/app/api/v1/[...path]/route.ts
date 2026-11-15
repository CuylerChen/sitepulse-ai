import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HOP_BY_HOP = new Set(["connection", "keep-alive", "transfer-encoding", "upgrade"]);

function apiBase(): string {
  return (process.env.API_INTERNAL_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
}

function setCookiesOf(headers: Headers): string[] {
  if (typeof headers.getSetCookie === "function") {
    const cookies = headers.getSetCookie().filter(Boolean);
    if (cookies.length > 0) return cookies;
  }
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

function applySetCookies(response: NextResponse, cookies: string[]) {
  for (const cookie of cookies) {
    if (cookie && !HOP_BY_HOP.has("set-cookie")) {
      response.headers.append("set-cookie", cookie);
    }
  }
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const target = `${apiBase()}/v1/${path.map((segment) => encodeURIComponent(segment)).join("/")}${request.nextUrl.search}`;

  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const origin = request.headers.get("origin");
  if (origin) headers.set("origin", origin);
  const accept = request.headers.get("accept");
  if (accept) headers.set("accept", accept);
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) headers.set("x-forwarded-for", forwarded.split(",")[0].trim());

  const method = request.method.toUpperCase();
  const init: RequestInit & { duplex?: "half" } = {
    method,
    headers,
    redirect: "manual",
  };

  if (method !== "GET" && method !== "HEAD") {
    const body = await request.arrayBuffer();
    if (body.byteLength > 0) {
      init.body = body;
      init.duplex = "half";
    }
  }

  try {
    const upstream = await fetch(target, init);
    const cookies = setCookiesOf(upstream.headers);
    const responseHeaders = new Headers();
    const upstreamType = upstream.headers.get("content-type");
    if (upstreamType) responseHeaders.set("content-type", upstreamType);

    if (upstream.status === 204 || upstream.status === 205) {
      const empty = new NextResponse(null, { status: upstream.status, headers: responseHeaders });
      applySetCookies(empty, cookies);
      return empty;
    }

    const response = new NextResponse(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: responseHeaders,
    });
    applySetCookies(response, cookies);
    return response;
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: "UPSTREAM_UNAVAILABLE",
          message: "The audit service is temporarily unavailable. Try again in a moment.",
        },
        request_id: "req_proxy",
      },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
