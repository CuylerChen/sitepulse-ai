"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UrlForm } from "@/components/url-form";
import { Card, Spinner } from "@/components/ui";
import { api, asApiError, type ApiError } from "@/lib/api";
import { formatDay, formatScore, planLabel, platformLabel, statusLabel, formatPeriod } from "@/lib/format";
import type { AuditList } from "@/lib/types";
import { ErrorNote } from "@/components/error-note";

export function DashboardClient() {
  const [data, setData] = useState<AuditList | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    api<AuditList>("/audits")
      .then(setData)
      .catch((err) => setError(asApiError(err)));
  }, []);

  if (error) return <ErrorNote error={error} />;
  if (!data) return <Spinner label="Loading your dashboard…" />;

  const usage = data.usage;
  const pct = usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;
  const recent = data.audits.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Plan: {planLabel(usage.plan)} · {formatPeriod(usage.period)}</p>
      </div>
      <Card>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Audits this period</h2>
            <p className="mt-1 text-sm text-muted">
              {usage.limit > 0 ? `${usage.used} of ${usage.limit} used` : `${usage.used} used`}
            </p>
          </div>
          {usage.limit > 0 && usage.used >= usage.limit ? (
            <Link href="/pricing" className="text-sm font-semibold text-primary">See plans</Link>
          ) : null}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <p className="sr-only">{pct}% of the monthly allowance used.</p>
      </Card>
      <Card>
        <h2 className="text-base font-semibold">New audit</h2>
        <p className="mb-4 mt-1 text-sm text-muted">Enter a homepage. We will open the report when the scan starts.</p>
        <UrlForm focus="full" id="dashboard-url" />
      </Card>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Recent audits</h2>
          <Link href="/app/audits" className="text-sm font-semibold text-primary">View all</Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No audits yet. Run one above to see a score and a fix list.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {recent.map((audit) => (
              <li key={audit.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link href={`/audits/${audit.id}`} className="font-medium text-ink hover:text-primary">
                    {audit.domain || audit.requested_url}
                  </Link>
                  <p className="text-sm text-muted">
                    {statusLabel(audit.status)} · {platformLabel(audit.platform)} · {formatDay(audit.created_at)}
                  </p>
                </div>
                <p className="text-sm font-semibold">{audit.overall_score == null ? "Not available" : formatScore(audit.overall_score)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
