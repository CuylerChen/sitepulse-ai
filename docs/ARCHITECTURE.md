# Architecture

```
apps/web     Next.js UI. Browser calls /api/v1, which proxies to the Go API except Waffo checkout, portal, and webhooks.
services/api Go API, audit worker, Postgres.
prompts/     Prompt files. The running binary uses the embedded system prompt in aireport.
```

The API creates an audit row and a job. Two in-process workers claim jobs with `FOR UPDATE SKIP LOCKED`. A job fetches one homepage, robots.txt, and at most one same-host sitemap. It does not execute JavaScript and does not crawl the rest of the site.

PageSpeed runs only when `PAGESPEED_API_KEY` is set. Results cache for 24 hours. Failures stay "not available".

AI output is accepted only when every issue references a real check. Otherwise the rule report is stored. Monthly token use is capped by `AI_MONTHLY_TOKEN_CAP`.

Job timeout is 80 seconds. Two PageSpeed calls often exceed the original 60 second sketch, so the cap was raised and each PageSpeed call still times out at 32 seconds.

Postgres is the only datastore. There is no Redis queue.

Pro checkout uses `@waffo/pancake-ts` in Next.js. The hosted Waffo webhook hits `/api/webhooks/waffo`, which verifies `x-waffo-signature` and forwards the event to Go so plan and quota stay in Postgres.
