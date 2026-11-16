# SitePulse AI

Free homepage audit for SEO, performance, and AI search readiness. Scores come from rules. AI text explains those rules and is omitted when it cannot be checked against them.

## Run locally

PostgreSQL database `sitepulse` must exist. Copy `.env.example` to `.env` if you need a different connection string.

```bash
cd services/api && go run ./cmd/server
cd apps/web && npm install && npm run dev
```

Open http://localhost:3000. The web app proxies `/api/v1` to http://127.0.0.1:8080.

Optional keys in `.env`:

- `PAGESPEED_API_KEY` for lab performance. Without it, performance is "Not available".
- `LLM_API_KEY` for model-written fixes. Without it, the rule report is used.
- `WAFFO_PRIVATE_KEY` and `WAFFO_PRO_PRODUCT_ID` for Pro checkout via Waffo Pancake. Put those values in `apps/web/.env.local`. In development, billing has a local upgrade button.

## Tests

```bash
cd services/api && go test ./...
```

## Limits

One homepage per audit. No Shopify OAuth, no scheduled monitoring, and no live ChatGPT ranking check. AI Readiness is not a ranking.
