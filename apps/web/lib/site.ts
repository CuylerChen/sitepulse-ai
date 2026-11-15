export const SITE_NAME = "SitePulse";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://sitepulse.ai").replace(/\/$/, "");

export const USER_AGENT =
  "SitePulseBot/1.0 (+https://sitepulse.ai/bot; single-page audit requested by the site visitor)";

export const RANKING_DISCLAIMER =
  "AI Readiness is a technical readiness score, not a ranking in ChatGPT, Google, or Perplexity.";

export const REPORT_DISCLAIMER =
  "AI Readiness measures whether crawlers can access and understand the site. It is not a ranking or a promise of traffic.";

export const API_INTERNAL_URL = (process.env.API_INTERNAL_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
