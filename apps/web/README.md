# SitePulse web

Next.js App Router frontend for SitePulse. The browser never calls the Go API directly.

## Run

```bash
cp .env.example .env.local
npm install
npm run dev
```

`API_INTERNAL_URL` defaults to `http://127.0.0.1:8080` when it is unset.

## Proxy

`app/api/v1/[...path]/route.ts` forwards `/api/v1/*` to `{API_INTERNAL_URL}/v1/*`.

It keeps the HTTP method and query string. It forwards the `cookie`, `content-type`, and `origin` request headers. Every `set-cookie` header on the Go response is copied back to the browser, so the session stays on the SitePulse origin.

The client helper in `lib/api.ts` calls that same-origin path, unwraps the `{ success, data, error }` envelope, and throws an `Error` with `code` and `message`.

PostHog is loaded only when `NEXT_PUBLIC_POSTHOG_KEY` is set. The dev-only billing upgrade button is shown only when `NEXT_PUBLIC_APP_ENV` is not `production`.

## Billing

Waffo Pancake checkout and webhooks run in this Next.js app with `@waffo/pancake-ts`. Set `WAFFO_MERCHANT_ID`, `WAFFO_STORE_ID`, `WAFFO_PRIVATE_KEY`, and `WAFFO_PRO_PRODUCT_ID` in `.env.local`. Create the Pro product once with `npm run setup:waffo`. Point the Waffo dashboard webhook to `https://sitepulse.ai/api/webhooks/waffo`.
