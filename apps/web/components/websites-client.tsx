"use client";

import { useEffect, useState } from "react";
import { api, asApiError, type ApiError } from "@/lib/api";
import { formatDay, formatScore, platformLabel } from "@/lib/format";
import type { Website } from "@/lib/types";
import { ErrorNote } from "@/components/error-note";
import { Button, ButtonLink, Card, Spinner } from "@/components/ui";

export function WebsitesClient() {
  const [websites, setWebsites] = useState<Website[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    api<{ websites: Website[] }>("/websites")
      .then((data) => setWebsites(data.websites))
      .catch((err) => setError(asApiError(err)));
  }, []);

  async function remove(id: string) {
    setPendingId(id);
    setError(null);
    try {
      await api(`/websites/${id}`, { method: "DELETE" });
      setWebsites((current) => (current ?? []).filter((item) => item.id !== id));
      setConfirmId(null);
    } catch (err) {
      setError(asApiError(err));
    } finally {
      setPendingId(null);
    }
  }

  if (!websites && !error) return <Spinner label="Loading websites…" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Websites</h1>
          <p className="mt-1 text-sm text-muted">Sites saved from your audits. Deleting a site does not delete the public web page.</p>
        </div>
        <ButtonLink href="/app/dashboard" variant="secondary">New audit</ButtonLink>
      </div>
      <ErrorNote error={error} />
      {websites && websites.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">No saved websites yet. Run an audit and SitePulse will keep the site here when the account has history.</p>
        </Card>
      ) : null}
      <ul className="space-y-3">
        {(websites ?? []).map((site) => (
          <li key={site.id}>
            <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-ink">{site.domain}</p>
                <p className="break-all text-sm text-muted">{site.url}</p>
                <p className="mt-1 text-sm text-muted">
                  {platformLabel(site.platform)} · Latest score {site.latest_score == null ? "Not available" : formatScore(site.latest_score)} · Added {formatDay(site.created_at)}
                </p>
              </div>
              {confirmId === site.id ? (
                <Button variant="danger" onClick={() => void remove(site.id)} disabled={pendingId === site.id}>
                  {pendingId === site.id ? "Deleting…" : "Confirm delete"}
                </Button>
              ) : (
                <Button variant="danger" onClick={() => setConfirmId(site.id)}>Delete</Button>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
