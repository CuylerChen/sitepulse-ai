import type { Check, Evidence, Severity } from "@/lib/types";

const KNOWN_LABELS: Record<string, string> = {
  status_code: "HTTP status",
  status: "Status",
  title: "Title",
  title_length: "Title length",
  meta_description: "Meta description",
  meta_description_length: "Meta description length",
  description_length: "Description length",
  description: "Description",
  h1: "H1",
  h1_count: "H1 count",
  h2_count: "H2 count",
  word_count: "Word count",
  length: "Length",
  bytes: "Size",
  canonical: "Canonical URL",
  final_url: "Final URL",
  requested_url: "Requested URL",
  url: "URL",
  robots: "Robots directive",
  meta_robots: "Meta robots",
  indexable: "Indexable",
  sitemap: "Sitemap",
  sitemap_found: "Sitemap found",
  sitemap_url: "Sitemap URL",
  content_type: "Content type",
  ttfb_ms: "Time to first byte",
  load_time_ms: "Load time",
  redirect_count: "Redirect count",
  redirects: "Redirects",
  platform: "Platform",
  schema_types: "Structured data types",
  json_ld_count: "JSON-LD blocks",
  jsonld_errors: "JSON-LD errors",
  images_missing_alt: "Images missing alt text",
  images_without_alt: "Images missing alt text",
  alt_missing: "Images missing alt text",
  gptbot: "GPTBot",
  "oai-searchbot": "OAI-SearchBot",
  oai_searchbot: "OAI-SearchBot",
  claudebot: "ClaudeBot",
  "claude-searchbot": "Claude-SearchBot",
  claude_searchbot: "Claude-SearchBot",
  perplexitybot: "PerplexityBot",
  googlebot: "Googlebot",
  sitepulsebot: "SitePulseBot",
  chatgpt_user: "ChatGPT-User",
  "chatgpt-user": "ChatGPT-User",
  allowed: "Access",
  blocked: "Blocked",
  found: "Found",
  missing: "Missing",
  value: "Value",
  expected: "Expected",
  actual: "Found",
  count: "Count",
  reason: "Reason",
  generator: "Generator",
  viewport: "Viewport",
  https: "HTTPS",
  truncated: "Response truncated",
};

const CRAWLER_KEYS = new Set([
  "gptbot",
  "oai-searchbot",
  "oai_searchbot",
  "claudebot",
  "claude-searchbot",
  "claude_searchbot",
  "perplexitybot",
  "googlebot",
  "sitepulsebot",
  "chatgpt-user",
  "chatgpt_user",
]);

const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

const STATUS_RANK: Record<string, number> = {
  fail: 0,
  warning: 1,
  unknown: 2,
  pass: 3,
};

export function formatScore(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) return "Not available";
  return String(score);
}

export function formatMs(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return "Not available";
  if (Math.abs(ms) >= 1000) {
    return `${(ms / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })} s`;
  }
  return `${ms.toLocaleString("en-US")} ms`;
}

export function formatCls(cls: number | null | undefined): string {
  if (cls == null || Number.isNaN(cls)) return "Not available";
  return cls.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "Not available";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function formatDay(iso?: string | null): string {
  if (!iso) return "Not available";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

export function formatPeriod(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return period;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

export function planLabel(plan: string): string {
  switch (plan) {
    case "anonymous":
      return "Signed out";
    case "free":
      return "Free";
    case "pro":
      return "Pro";
    case "agency":
      return "Agency";
    default:
      return plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Not available";
  }
}

export function platformLabel(platform?: string): string {
  if (platform === "shopify") return "Shopify";
  if (platform === "custom") return "Custom site";
  if (!platform) return "Not available";
  return platform;
}

export function statusLabel(status: string): string {
  switch (status) {
    case "pass":
      return "Pass";
    case "warning":
      return "Needs attention";
    case "fail":
      return "Fail";
    case "unknown":
      return "Unknown";
    case "pending":
      return "Queued";
    case "running":
      return "Running";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return humanize(status);
  }
}

export function severityLabel(severity: string): string {
  switch (severity) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    case "info":
      return "Info";
    default:
      return humanize(severity);
  }
}

export function categoryLabel(category: string): string {
  switch (category) {
    case "seo":
      return "SEO";
    case "performance":
      return "Performance";
    case "ai":
      return "AI readiness";
    case "content":
      return "Content";
    case "shopify":
      return "Shopify";
    default:
      return humanize(category);
  }
}

export function progressLabel(progress: string): string {
  switch (progress) {
    case "queued":
      return "In line";
    case "validating":
      return "Checking the URL";
    case "fetching":
      return "Opening the homepage";
    case "analyzing":
      return "Reviewing the page";
    case "performance":
      return "Measuring performance";
    case "insights":
      return "Writing recommendations";
    case "completed":
      return "Done";
    case "failed":
      return "Could not finish";
    default:
      return humanize(progress || "working");
  }
}

export function humanize(key: string): string {
  const known = KNOWN_LABELS[key.toLowerCase()];
  if (known) return known;
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isAccessValue(value: unknown): boolean {
  if (typeof value === "boolean") return true;
  if (typeof value !== "string") return false;
  return ["allowed", "blocked", "unknown", "yes", "no"].includes(value.toLowerCase());
}

function accessText(key: string, value: unknown): string {
  if (value == null) return "unknown";
  if (typeof value === "boolean") {
    if (CRAWLER_KEYS.has(key.toLowerCase()) || /bot|crawler|allow/i.test(key)) {
      return value ? "allowed" : "blocked";
    }
    return value ? "yes" : "no";
  }
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower === "allowed" || lower === "blocked" || lower === "unknown") return lower;
    if (lower === "yes" || lower === "true") return CRAWLER_KEYS.has(key.toLowerCase()) ? "allowed" : "yes";
    if (lower === "no" || lower === "false") return CRAWLER_KEYS.has(key.toLowerCase()) ? "blocked" : "no";
  }
  return String(value);
}

function formatPrimitive(key: string, value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "boolean" || isAccessValue(value)) {
    return accessText(key, value);
  }
  if (typeof value === "number") {
    if (Number.isNaN(value)) return null;
    if (/_ms$/.test(key) || key === "ttfb") return formatMs(value);
    if (key === "cls") return formatCls(value);
    if (/length$/.test(key) || key === "length") return `${value.toLocaleString("en-US")} characters`;
    if (key === "bytes") return `${value.toLocaleString("en-US")} bytes`;
    return value.toLocaleString("en-US");
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.length > 280) return `${trimmed.slice(0, 277)}…`;
    return accessText(key, trimmed);
  }
  return null;
}

export function evidenceLines(evidence: Evidence | null | undefined): string[] {
  if (!evidence) return [];
  const lines: string[] = [];

  const visit = (record: Evidence) => {
    for (const [key, value] of Object.entries(record)) {
      if (value && typeof value === "object") {
        if (Array.isArray(value)) {
          const primitives = value.filter((item) => ["string", "number", "boolean"].includes(typeof item));
          if (primitives.length > 0 && primitives.length === value.length && primitives.length <= 8) {
            lines.push(`${humanize(key)}: ${primitives.map((item) => String(item)).join(", ")}`);
          }
          continue;
        }
        const nested = value as Evidence;
        const entries = Object.entries(nested);
        if (entries.length > 0 && entries.every(([, item]) => isAccessValue(item) || item == null)) {
          for (const [nestedKey, nestedValue] of entries) {
            lines.push(`${humanize(nestedKey)}: ${accessText(nestedKey, nestedValue)}`);
          }
          continue;
        }
        const before = lines.length;
        visit(nested);
        if (lines.length === before) {
          continue;
        }
        continue;
      }
      const formatted = formatPrimitive(key, value);
      if (formatted) lines.push(`${humanize(key)}: ${formatted}`);
    }
  };

  visit(evidence);
  return lines.slice(0, 12);
}

export function hasTechnicalEvidence(evidence: Evidence | null | undefined): boolean {
  if (!evidence) return false;
  return Object.keys(evidence).length > 0;
}

export function sortChecks(checks: Check[]): Check[] {
  return [...checks].sort((a, b) => {
    const status = (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
    if (status !== 0) return status;
    return (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9);
  });
}

export function severityRank(severity: string): number {
  return SEVERITY_RANK[severity] ?? 9;
}

export function isPrioritySeverity(severity: string): boolean {
  return severity === "critical" || severity === "high";
}

export function fieldDataLabel(value: string | null | undefined): string {
  if (value === "available") return "Field data from real visitors is included.";
  if (value === "not_available") return "Field data from real visitors was not available.";
  if (!value) return "Not available";
  return humanize(value);
}

export type ScoreTone = "neutral";

export function isSeverity(value: string): value is Severity {
  return value in SEVERITY_RANK;
}
