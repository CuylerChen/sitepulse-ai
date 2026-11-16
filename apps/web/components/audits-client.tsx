"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, asApiError, type ApiError } from "@/lib/api";
import { formatDay, formatScore, platformLabel, statusLabel } from "@/lib/format";
import type { AuditList, AuditSummary } from "@/lib/types";
import { ErrorNote } from "@/components/error-note";
import { Button, ButtonLink, Card, Spinner } from "@/components/ui";

export function AuditsClient() {
  const [audits, setAudits] = useState<AuditSummary[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    api<AuditList>("/audits")
      .then((data) => setAudits(data.audits))
      .catch((err) => setError(asApiError(err)));
  }, []);

  async function remove(id: string) {
    setPendingId(id);
    setError(null);
    try {
      await api(`/audits/${id}`, { method: "DELETE" });
      setAudits((current) => (current ?? []).filter((item) => item.id !== id));
    } catch (err) {
      setError(asApiError(err));
    } finally {
      setPendingId(null);
    }
  }

  if (!audits && !error) return <Spinner label="Loading audit history…" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Audits</h1>
          <p className="mt-1 text-sm text-muted">Past homepage scans on this account.</p>
        </div>
        <ButtonLink href="/#audit" variant="secondary">Run free audit</ButtonLink>
      </div>
      <ErrorNote error={error} />
      {audits && audits.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">No audits yet. Run a homepage scan and it will show up here.</p>
        </Card>
      ) : null}
      {audits && audits.length > 0 ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => (
                <tr key={audit.id} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3">
                    <Link href={`/audits/${audit.id}`} className="font-medium text-ink hover:text-primary">
                      {audit.domain || audit.requested_url}
                    </Link>
                    <p className="text-xs text-muted">{platformLabel(audit.platform)}{audit.grade ? ` · ${audit.grade}` : ""}</p>
                  </td>
                  <td className="px-4 py-3">{statusLabel(audit.status)}</td>
                  <td className="px-4 py-3">{audit.overall_score == null ? "Not available" : formatScore(audit.overall_score)}</td>
                  <td className="px-4 py-3">{formatDay(audit.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="danger" onClick={() => void remove(audit.id)} disabled={pendingId === audit.id}>
                      {pendingId === audit.id ? "Deleting…" : "Delete"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
    </div>
  );
}
