"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { ScoreRing } from "@/components/score-ring";
import { Button, ButtonLink, Card } from "@/components/ui";
import { ErrorNote } from "@/components/error-note";
import { ApiError, api, asApiError } from "@/lib/api";
import {
  categoryLabel,
  evidenceLines,
  fieldDataLabel,
  formatCls,
  formatDate,
  formatMs,
  formatScore,
  hasTechnicalEvidence,
  isPrioritySeverity,
  platformLabel,
  severityLabel,
  severityRank,
  sortChecks,
  statusLabel,
} from "@/lib/format";
import { REPORT_DISCLAIMER, SITE_URL } from "@/lib/site";
import type { AiIssue, Check, PerformanceReport, PsiResult, Report, ShareInfo, Usage } from "@/lib/types";

const CATEGORY_ORDER = ["seo", "performance", "ai", "content", "shopify"];

const SCORE_CARDS = [
  { key: "seo" as const, label: "SEO", note: "Titles, indexability, and on-page signals from this page." },
  { key: "performance" as const, label: "Performance", note: "Shown only when the scan returns a performance score." },
  { key: "ai_readiness" as const, label: "AI Readiness", note: "Whether crawlers can access and understand the page." },
  { key: "content" as const, label: "Content", note: "Headings, description, and whether the page states what you sell." },
];

function badgeClass(kind: string): string {
  if (kind === "critical" || kind === "fail") return "bg-red-500/15 text-error";
  if (kind === "high" || kind === "warning") return "bg-warning/15 text-warning";
  if (kind === "pass") return "bg-primary/15 text-primary";
  if (kind === "medium") return "bg-warning/15 text-warning";
  return "bg-page text-muted";
}

function absoluteShareUrl(info: ShareInfo | null | undefined, fallback: string): string {
  if (!info) return fallback;
  if (info.url && /^https?:\/\//i.test(info.url)) return info.url;
  if (info.url?.startsWith("/")) return `${SITE_URL}${info.url}`;
  if (info.token) return `${SITE_URL}/report/${info.token}`;
  return info.url || fallback;
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const field = document.createElement("textarea");
  field.value = value;
  document.body.appendChild(field);
  field.select();
  document.execCommand("copy");
  field.remove();
}

function EvidenceBlock({ evidence }: { evidence: Check["evidence"] }) {
  const lines = evidenceLines(evidence);
  if (!lines.length && !hasTechnicalEvidence(evidence)) return null;
  return (
    <div className="mt-3">
      {lines.length ? (
        <ul className="space-y-1 text-sm text-ink">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Details are in the technical evidence.</p>
      )}
      {hasTechnicalEvidence(evidence) ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-muted">Technical evidence</summary>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-page p-3 text-xs leading-5 text-ink">
            {JSON.stringify(evidence, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      className="no-print"
      onClick={() => {
        void copyText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function IssueCard({ issue }: { issue: AiIssue }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass(issue.severity)}`}>
          {severityLabel(issue.severity)}
        </span>
      </div>
      <h3 className="mt-3 text-base font-semibold text-ink">{issue.problem}</h3>
      {issue.impact ? <p className="mt-2 text-sm leading-6 text-muted">Impact: {issue.impact}</p> : null}
      {issue.recommended_fix ? <p className="mt-2 text-sm leading-6 text-ink">{issue.recommended_fix}</p> : null}
      {issue.implementation_steps?.length ? (
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-6 text-ink">
          {issue.implementation_steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      ) : null}
      {issue.suggested_copy ? (
        <div className="mt-4 rounded-xl border border-line bg-page p-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm leading-6 text-ink">{issue.suggested_copy}</p>
            <CopyButton text={issue.suggested_copy} />
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function CheckCard({ check }: { check: Check }) {
  return (
    <article className="border-b border-line py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass(check.status)}`}>
          {statusLabel(check.status)}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass(check.severity)}`}>
          {severityLabel(check.severity)}
        </span>
        {check.max_score > 0 ? (
          <span className="text-xs text-muted">
            {check.score} / {check.max_score}
          </span>
        ) : null}
      </div>
      <h4 className="mt-2 text-sm font-semibold text-ink">{check.title}</h4>
      {check.description ? <p className="mt-1 text-sm leading-6 text-muted">{check.description}</p> : null}
      {check.recommendation ? <p className="mt-2 text-sm leading-6 text-ink">{check.recommendation}</p> : null}
      <EvidenceBlock evidence={check.evidence} />
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-page px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function PsiPanel({ title, result }: { title: string; result: PsiResult | null }) {
  if (!result) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <p className="mt-2 text-sm text-muted">Not available</p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Metric label="Performance" value={formatScore(result.performance_score)} />
        <Metric label="Accessibility" value={formatScore(result.accessibility_score)} />
        <Metric label="Best practices" value={formatScore(result.best_practices_score)} />
        <Metric label="SEO" value={formatScore(result.seo_score)} />
        <Metric label="LCP" value={formatMs(result.lcp_ms)} />
        <Metric label="CLS" value={formatCls(result.cls)} />
        <Metric label="INP" value={formatMs(result.inp_ms)} />
        <Metric label="FCP" value={formatMs(result.fcp_ms)} />
        <Metric label="TTFB" value={formatMs(result.ttfb_ms)} />
      </div>
      <p className="mt-2 text-xs leading-5 text-muted">{fieldDataLabel(result.field_data)}</p>
    </div>
  );
}

function PerformanceSection({ performance }: { performance: PerformanceReport | null | undefined }) {
  if (!performance || (!performance.available && !performance.mobile && !performance.desktop)) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">Performance detail</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {performance?.reason || "Performance data was not returned for this scan. A missing result is not a score of zero."}
        </p>
      </Card>
    );
  }
  return (
    <Card>
      <h2 className="text-lg font-semibold">Performance detail</h2>
      {performance.reason ? <p className="mt-2 text-sm leading-6 text-muted">{performance.reason}</p> : null}
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <PsiPanel title="Mobile" result={performance.mobile} />
        <PsiPanel title="Desktop" result={performance.desktop} />
      </div>
      {performance.origin_ttfb_ms != null ? (
        <p className="mt-3 text-sm text-muted">Origin time to first byte: {formatMs(performance.origin_ttfb_ms)}</p>
      ) : null}
    </Card>
  );
}

function PdfControl() {
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<Usage>("/usage")
      .then((usage) => {
        if (!cancelled) setPlan(usage.plan);
      })
      .catch(() => {
        if (!cancelled) setPlan("anonymous");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!plan) return <p className="text-sm text-muted">Checking export options…</p>;
  if (plan === "pro" || plan === "agency") {
    return (
      <Button onClick={() => window.print()} className="no-print">
        Download PDF
      </Button>
    );
  }
  return (
    <div className="no-print rounded-xl border border-line bg-page px-3 py-2">
      <p className="text-sm text-ink">PDF export is included with Pro.</p>
      <Link href="/pricing" className="mt-1 inline-flex text-sm font-semibold text-primary">
        See Pro pricing
      </Link>
    </div>
  );
}

function ShareBar({
  auditId,
  initial,
  mode,
  fallbackUrl,
  publicToken,
}: {
  auditId?: string;
  initial?: ShareInfo | null;
  mode: "owner" | "public" | "sample";
  fallbackUrl: string;
  publicToken?: string;
}) {
  const [info, setInfo] = useState(initial ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const link = absoluteShareUrl(info?.url ? info : publicToken ? { token: publicToken, is_public: true, url: "" } : info, fallbackUrl);
  const text = "Website audit report from SitePulse";

  async function publish() {
    if (!auditId) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api<ShareInfo>(`/reports/${auditId}/share`, {
        method: "POST",
        body: JSON.stringify({ is_public: true }),
      });
      setRevoked(false);
      setInfo(next);
    } catch (err) {
      setError(asApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function unshare() {
    const token = info?.token || publicToken;
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/reports/share/${token}`, { method: "DELETE" });
      setRevoked(true);
      setInfo({ token: "", is_public: false, url: "" });
    } catch (err) {
      const apiError = asApiError(err);
      setError(apiError.code === "UNAUTHORIZED" ? new ApiError("Log in to unpublish this link.", "UNAUTHORIZED") : apiError);
    } finally {
      setBusy(false);
    }
  }

  if (mode === "sample") return null;

  const xHref = `https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
  const linkedInHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`;
  const published = !revoked && (mode === "public" ? Boolean(link) : Boolean(info?.is_public && link));

  return (
    <Card className="no-print">
      <h2 className="text-base font-semibold">Share this report</h2>
      <div className="mt-3 flex flex-col gap-3">
        {mode === "owner" && !published ? (
          <Button onClick={() => void publish()} disabled={busy || !auditId}>
            {busy ? "Publishing…" : "Publish report"}
          </Button>
        ) : null}
        {published ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <a className="inline-flex h-11 items-center justify-center rounded-sm bg-primary px-4 text-sm font-semibold text-white" href={xHref} target="_blank" rel="noreferrer">
              Share on X
            </a>
            <a className="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-card px-4 text-sm font-semibold text-ink" href={linkedInHref} target="_blank" rel="noreferrer">
              Share on LinkedIn
            </a>
            <Button
              variant="secondary"
              onClick={() => {
                void copyText(link).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                });
              }}
            >
              {copied ? "Link copied" : "Copy link"}
            </Button>
            <Button variant="danger" onClick={() => void unshare()} disabled={busy || !(info?.token || publicToken)}>
              Unshare
            </Button>
          </div>
        ) : mode === "public" ? (
          <p className="text-sm text-muted">This public link is no longer available for sharing.</p>
        ) : (
          <p className="text-sm text-muted">Publish the report, then share the public link.</p>
        )}
        <ErrorNote error={error} />
      </div>
    </Card>
  );
}

export function ReportView({
  report,
  mode,
  siteUrl = SITE_URL,
  publicToken,
}: {
  report: Report;
  mode: "owner" | "public" | "sample";
  siteUrl?: string;
  publicToken?: string;
}) {
  const router = useRouter();
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deleteError, setDeleteError] = useState<ApiError | null>(null);
  const [deleting, setDeleting] = useState(false);
  const audit = report.audit;
  const checks = report.checks ?? [];
  const issues = [...(report.ai_report?.issues ?? [])].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  const priorityIssues = issues.filter((issue) => isPrioritySeverity(issue.severity));
  const otherIssues = issues.filter((issue) => !isPrioritySeverity(issue.severity));
  const covered = new Set(priorityIssues.map((issue) => issue.check_key));
  const priorityChecks = sortChecks(checks.filter((check) => isPrioritySeverity(check.severity) && !covered.has(check.check_key) && check.status !== "pass"));
  const disclaimer = report.disclaimer || REPORT_DISCLAIMER;
  const extraDisclaimers = (report.ai_report?.disclaimers ?? []).filter((item) => item && item !== disclaimer);

  const groups = useMemo(() => {
    const map = new Map<string, Check[]>();
    for (const check of checks) {
      const key = check.category || "other";
      map.set(key, [...(map.get(key) ?? []), check]);
    }
    const keys = [...map.keys()].sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    return keys.map((key) => ({ key, checks: sortChecks(map.get(key) ?? []) }));
  }, [checks]);

  const scores = audit.scores;
  const fallbackUrl = audit.id ? `${siteUrl}/audits/${audit.id}` : siteUrl;

  async function removeAudit() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api(`/audits/${audit.id}`, { method: "DELETE" });
      router.push("/app/audits");
    } catch (err) {
      setDeleteError(asApiError(err));
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      {mode === "sample" ? (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-semibold text-warning">
          Sample data — not a live scan
        </div>
      ) : null}
      <div className="mb-2 hidden print:block">
        <Logo />
        <p className="mt-2 text-sm text-muted">Website audit report</p>
      </div>
      <section className="score-panel border border-line bg-white p-6 md:p-8">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
          <ScoreRing score={audit.overall_score} />
          <div className="min-w-0">
            <p className="text-sm text-muted">Grade</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink md:text-3xl">
              {audit.grade_label || audit.grade || "Audit report"}
            </h1>
            <p className="mt-2 break-all text-sm text-ink">{audit.domain || audit.requested_url}</p>
            <p className="mt-1 text-sm text-muted">
              {mode === "sample" ? "Sample preview" : `Scanned ${formatDate(audit.scanned_at)}`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {audit.grade ? <span className="bg-page px-2 py-1 text-ink">{audit.grade}</span> : null}
              {audit.platform ? <span className="bg-page px-2 py-1 text-ink">{platformLabel(audit.platform)}</span> : null}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SCORE_CARDS.map((card) => {
          const value = scores ? scores[card.key] : null;
          const missing = value == null;
          return (
            <Card key={card.key} className="p-4">
              <p className="text-sm text-muted">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold">{formatScore(value)}</p>
              {missing ? (
                <p className="mt-2 text-xs leading-5 text-muted">
                  {card.key === "performance"
                    ? report.performance?.reason || "Not available. This scan did not return a performance score. That is not a zero."
                    : "Not available. A missing score is not a zero."}
                </p>
              ) : (
                <p className="mt-2 text-xs leading-5 text-muted">{card.note}</p>
              )}
            </Card>
          );
        })}
      </div>

      <div className="rounded-xl border border-line border-l-4 border-l-primary bg-card px-4 py-3 text-sm leading-6 text-ink">
        {disclaimer}
      </div>
      {extraDisclaimers.map((item) => (
        <p key={item} className="text-sm leading-6 text-muted">
          {item}
        </p>
      ))}

      {mode !== "sample" ? (
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
          <ShareBar
            mode={mode}
            auditId={audit.id}
            initial={report.share}
            publicToken={publicToken || report.share?.token}
            fallbackUrl={mode === "public" ? `${siteUrl}/report/${publicToken || report.share?.token || ""}` : fallbackUrl}
          />
          <PdfControl />
        </div>
      ) : null}

      {report.ai_report?.summary?.headline ? (
        <Card>
          <h2 className="text-lg font-semibold">{report.ai_report.summary.headline}</h2>
          {report.ai_report.summary.description ? (
            <p className="mt-2 text-sm leading-6 text-muted">{report.ai_report.summary.description}</p>
          ) : null}
          {report.ai_report.summary.top_priority ? (
            <p className="mt-3 text-sm leading-6 text-ink">
              <span className="font-semibold">Start here: </span>
              {report.ai_report.summary.top_priority}
            </p>
          ) : null}
        </Card>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Fix these first</h2>
        {priorityIssues.length === 0 && priorityChecks.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">No critical or high issues were found in this scan.</p>
          </Card>
        ) : null}
        {priorityIssues.map((issue) => (
          <IssueCard key={`${issue.check_key}-${issue.problem}`} issue={issue} />
        ))}
        {priorityChecks.map((check) => (
          <Card key={check.check_key}>
            <CheckCard check={check} />
          </Card>
        ))}
      </section>

      {otherIssues.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Other recommendations</h2>
          {otherIssues.map((issue) => (
            <IssueCard key={`${issue.check_key}-${issue.problem}`} issue={issue} />
          ))}
        </section>
      ) : null}

      {report.ai_report?.quick_wins?.length ? (
        <Card>
          <h2 className="text-lg font-semibold">Quick wins</h2>
          <ul className="mt-3 space-y-3">
            {report.ai_report.quick_wins.map((win) => (
              <li key={`${win.check_key}-${win.title}`}>
                <p className="text-sm font-semibold text-ink">{win.title}</p>
                <p className="text-sm leading-6 text-muted">{win.action}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {scores?.notes?.length ? (
        <Card>
          <h2 className="text-lg font-semibold">How this score was read</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted">
            {scores.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <PerformanceSection performance={report.performance} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Check details</h2>
        {groups.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">No checks were returned for this scan.</p>
          </Card>
        ) : (
          groups.map((group) => (
            <Card key={group.key}>
              <h3 className="text-base font-semibold">{categoryLabel(group.key)}</h3>
              <div className="mt-1">
                {group.checks.map((check) => (
                  <CheckCard key={`${check.check_key}-${check.title}`} check={check} />
                ))}
              </div>
            </Card>
          ))
        )}
      </section>

      {audit.final_url && audit.final_url !== audit.requested_url ? (
        <p className="text-sm text-muted">Scanned {audit.final_url} after redirects from {audit.requested_url}.</p>
      ) : null}

      {mode === "owner" ? (
        <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center">
          <ButtonLink href="/#audit" variant="secondary">
            Run another audit
          </ButtonLink>
          {deleteArmed ? (
            <Button variant="danger" onClick={() => void removeAudit()} disabled={deleting}>
              {deleting ? "Deleting…" : "Confirm delete"}
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setDeleteArmed(true)}>
              Delete audit
            </Button>
          )}
          <ErrorNote error={deleteError} />
        </div>
      ) : null}
    </div>
  );
}
