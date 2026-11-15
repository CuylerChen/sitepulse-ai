import type { Envelope } from "@/lib/types";

export class ApiError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

export function asApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof Error && err.message) return new ApiError(err.message, "REQUEST_FAILED");
  return new ApiError("Something went wrong. Please try again.", "REQUEST_FAILED");
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(`/api/v1${path.startsWith("/") ? path : `/${path}`}`, {
      ...init,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new ApiError("We could not reach SitePulse. Check your connection and try again.", "NETWORK");
  }

  const text = await res.text();
  if (!text) {
    if (!res.ok) {
      throw new ApiError("Something went wrong. Please try again.", res.status === 401 ? "UNAUTHORIZED" : "REQUEST_FAILED");
    }
    return undefined as T;
  }

  let payload: Envelope<T>;
  try {
    payload = JSON.parse(text) as Envelope<T>;
  } catch {
    throw new ApiError("The server returned an unexpected response.", "BAD_RESPONSE");
  }

  if (!payload.success) {
    throw new ApiError(
      payload.error?.message || "Something went wrong. Please try again.",
      payload.error?.code || (res.status === 401 ? "UNAUTHORIZED" : "REQUEST_FAILED"),
    );
  }

  return payload.data as T;
}

export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return "/app/dashboard";
  }
  return value;
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
