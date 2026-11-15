import { cache } from "react";
import { API_INTERNAL_URL } from "@/lib/site";
import type { Report } from "@/lib/types";

export type PublicReportResult =
  | { ok: true; report: Report }
  | { ok: false; reason: "not_found" | "unavailable" };

export const getPublicReport = cache(async (token: string): Promise<PublicReportResult> => {
  if (!token || token.length > 200) return { ok: false, reason: "not_found" };
  try {
    const res = await fetch(`${API_INTERNAL_URL}/v1/public/reports/${encodeURIComponent(token)}`, {
      cache: "no-store",
    });
    if (res.status === 404) return { ok: false, reason: "not_found" };
    if (!res.ok) return { ok: false, reason: "unavailable" };
    const json = (await res.json()) as { success?: boolean; data?: Report };
    if (!json.success || !json.data?.audit) return { ok: false, reason: "unavailable" };
    return { ok: true, report: json.data };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
});
