export type Focus = "seo" | "ai" | "shopify" | "grader" | "full";

export type CheckStatus = "pass" | "warning" | "fail" | "unknown";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type Progress =
  | "queued"
  | "validating"
  | "fetching"
  | "analyzing"
  | "performance"
  | "insights"
  | "completed"
  | "failed"
  | string;

export type PlanId = "anonymous" | "free" | "pro" | "agency";

export type Evidence = Record<string, unknown>;

export type Check = {
  category: "seo" | "performance" | "ai" | "content" | "shopify" | string;
  check_key: string;
  status: CheckStatus | string;
  score: number;
  max_score: number;
  severity: Severity | string;
  title: string;
  description: string;
  evidence: Evidence | null;
  recommendation: string;
};

export type Scores = {
  seo: number | null;
  performance: number | null;
  ai_readiness: number | null;
  content: number | null;
  overall?: number | null;
  grade?: string;
  grade_label?: string;
  notes?: string[];
};

export type PsiResult = {
  performance_score: number | null;
  accessibility_score: number | null;
  best_practices_score: number | null;
  seo_score: number | null;
  lcp_ms: number | null;
  cls: number | null;
  inp_ms: number | null;
  fcp_ms: number | null;
  ttfb_ms: number | null;
  field_data: "available" | "not_available" | string;
};

export type PerformanceReport = {
  available: boolean;
  reason?: string;
  mobile: PsiResult | null;
  desktop: PsiResult | null;
  origin_ttfb_ms?: number | null;
};

export type AiIssue = {
  check_key: string;
  severity: Severity | string;
  problem: string;
  impact: string;
  recommended_fix: string;
  implementation_steps: string[];
  suggested_copy?: string;
};

export type QuickWin = {
  check_key: string;
  title: string;
  action: string;
};

export type AiReport = {
  version: string;
  summary: {
    headline: string;
    description: string;
    top_priority: string;
  };
  issues: AiIssue[];
  quick_wins: QuickWin[];
  disclaimers: string[];
};

export type ShareInfo = {
  token: string;
  is_public: boolean;
  url: string;
};

export type AuditView = {
  id: string;
  requested_url: string;
  final_url?: string;
  domain?: string;
  status: string;
  progress: Progress;
  overall_score: number | null;
  grade?: string;
  grade_label?: string;
  scores?: Scores | null;
  platform?: "custom" | "shopify" | string;
  scanned_at?: string | null;
  error_message?: string;
  created_at?: string;
};

export type Report = {
  audit: AuditView;
  checks?: Check[];
  ai_report?: AiReport | null;
  performance?: PerformanceReport | null;
  share?: ShareInfo | null;
  disclaimer?: string;
};

export type AuditCreate = {
  audit_id: string;
  status: string;
  estimated_seconds: number;
};

export type AuditSummary = {
  id: string;
  domain: string;
  requested_url: string;
  status: string;
  overall_score: number | null;
  grade: string;
  created_at: string;
  platform: string;
};

export type Usage = {
  authenticated?: boolean;
  plan: PlanId | string;
  used: number;
  limit: number;
  period: string;
};

export type AuditList = {
  audits: AuditSummary[];
  usage: Usage;
};

export type User = {
  authenticated: boolean;
  id: string;
  email: string;
  name: string;
  plan: "free" | "pro" | "agency" | string;
};

export type Website = {
  id: string;
  domain: string;
  url: string;
  platform: string;
  latest_score: number | null;
  created_at: string;
};

export type BillingPlan = {
  id: "free" | "pro" | "agency" | string;
  name: string;
  price_monthly: number;
  description: string;
  features: string[];
  available: boolean;
};

export type Subscription = {
  plan: string;
  status: string;
  provider: string;
  current_period_end: string | null;
};

export type Envelope<T> = {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
  request_id?: string;
};
