# SitePulse AI

Website audit and AI search readiness for independent site owners and Shopify merchants in the US English market.

## What the user does

Enter a public homepage URL. The product fetches that page, robots.txt, and a sitemap if one is on the same host. It scores SEO, performance, AI crawler readiness, and content with deterministic rules, then explains the evidence. The user can share a public report and upgrade to Pro.

## MVP

- Anonymous audit, no signup required, 3 audits per month
- Homepage only
- SEO, AI crawler rules, content structure, optional PageSpeed
- Rule-based report always; LLM explanation only when configured and validated
- Public share links that can be revoked
- Email accounts, history, and Creem checkout for Pro at $19/month
- Agency white-label, monitoring, and live AI ranking checks are out of scope

## Scores

Overall = 0.35 SEO + 0.25 Performance + 0.30 AI Readiness + 0.10 Content.

If PageSpeed is missing, performance stays null and the other weights are renormalized. Unknown crawler rules score 0 and are not labeled allowed. The score is technical readiness, not a ranking.

## Plans

| Plan | Price | Audits / month |
| --- | --- | --- |
| Free / anonymous | $0 | 3 |
| Pro | $19 | 30 |
| Agency | Not sold | Later |
