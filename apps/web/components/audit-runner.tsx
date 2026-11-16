"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, api, asApiError } from "@/lib/api";
import { progressLabel } from "@/lib/format";
import type { Report } from "@/lib/types";
import { ReportView } from "@/components/report-view";
import { Button, ButtonLink, Card, Spinner } from "@/components/ui";
import { ErrorNote } from "@/components/error-note";

const STEPS = ["queued", "validating", "fetching", "analyzing", "performance", "insights"];

export function AuditRunner({ id, eta }: { id: string; eta?: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;

    async function tick() {
      try {
        const data = await api<Report>(`/audits/${id}`);
        if (cancelled) return;
        setReport(data);
        setError(null);
        const status = data.audit?.status;
        const progress = data.audit?.progress;
        if (status === "completed" || status === "failed" || progress === "failed") return;
        timer = window.setTimeout(tick, 2000);
      } catch (err) {
        if (cancelled) return;
        setError(asApiError(err));
      }
    }

    void tick();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [id, attempt]);

  const etaNumber = Number(eta);
  const showEta = Number.isFinite(etaNumber) && etaNumber > 0 && etaNumber <= 300;
  const audit = report?.audit;
  const failed = audit?.status === "failed" || audit?.progress === "failed";
  const completed = audit?.status === "completed";
  const current = audit?.progress || "queued";
  const currentIndex = STEPS.indexOf(current);

  async function retry() {
    setRetrying(true);
    setError(null);
    try {
      await api(`/audits/${id}/retry`, { method: "POST" });
      setReport(null);
      setAttempt((value) => value + 1);
    } catch (err) {
      setError(asApiError(err));
    } finally {
      setRetrying(false);
    }
  }

  if (error && !report) {
    return (
      <Card>
        <h1 className="text-2xl font-semibold">We could not load this audit</h1>
        <div className="mt-3">
          <ErrorNote error={error} />
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => setAttempt((value) => value + 1)}>Try again</Button>
          <ButtonLink href="/#audit" variant="secondary">
            Start a new audit
          </ButtonLink>
        </div>
      </Card>
    );
  }

  if (!audit) {
    return (
      <Card>
        <Spinner label="Starting the audit…" />
        <p className="mt-3 text-sm text-muted">We are opening the page you submitted.</p>
      </Card>
    );
  }

  if (completed && report) {
    return <ReportView report={report} mode="owner" />;
  }

  if (failed) {
    return (
      <Card>
        <h1 className="text-2xl font-semibold">This audit did not finish</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {audit.error_message || "The scan stopped before a report was ready. You can retry the same URL."}
        </p>
        <p className="mt-2 break-all text-sm text-ink">{audit.requested_url}</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => void retry()} disabled={retrying}>
            {retrying ? "Retrying…" : "Retry audit"}
          </Button>
          <ButtonLink href="/#audit" variant="secondary">
            Run a different URL
          </ButtonLink>
        </div>
        <div className="mt-3">
          <ErrorNote error={error} />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div aria-live="polite">
        <p className="text-sm font-medium text-primary">Audit in progress</p>
        <h1 className="mt-1 text-2xl font-semibold">{progressLabel(current)}</h1>
        <p className="mt-2 break-all text-sm text-muted">{audit.domain || audit.requested_url}</p>
        {showEta ? <p className="mt-1 text-sm text-muted">About {etaNumber} seconds.</p> : (
          <p className="mt-1 text-sm text-muted">Most homepage audits finish in under a minute.</p>
        )}
      </div>
      <ol className="mt-6 space-y-2">
        {STEPS.map((step, index) => {
          const done = currentIndex > index;
          const active = step === current;
          return (
            <li key={step} className="flex items-center gap-3 text-sm">
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  active ? "bg-primary text-white" : done ? "bg-primary/10 text-primary" : "bg-page text-muted"
                }`}
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <span className={active ? "font-semibold text-ink" : "text-muted"}>{progressLabel(step)}</span>
            </li>
          );
        })}
      </ol>
      {audit.error_message ? <p className="mt-4 text-sm text-error">{audit.error_message}</p> : null}
      <p className="mt-6 text-sm text-muted">
        You can leave this page open. We only fetch the submitted page, robots.txt, and the sitemap.{" "}
        <Link href="/bot" className="font-semibold text-primary">
          How SitePulseBot works
        </Link>
      </p>
    </Card>
  );
}
