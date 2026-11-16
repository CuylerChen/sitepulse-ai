# Security

The crawler accepts only `http` and `https` on ports 80 and 443. It rejects userinfo, localhost, private networks, link-local and cloud metadata addresses, CGNAT, and non-public DNS answers. Every address in a DNS response must be public. Each redirect is checked again, and the dialer resolves the host at connect time so a DNS rebinding result cannot be used.

The user cannot set request headers. Response bodies are capped at 5 MB. HTML parsing stops at 2 MB. JavaScript is not executed. Sitemap URLs must pass the same checks and stay on the final host.

Public reports store sanitized evidence only: short strings, booleans, numbers, and short type lists. Cookies, tokens, and raw HTML are not stored.

Public billing webhooks hit Next.js at `/api/webhooks/waffo`. The Waffo Pancake SDK verifies `x-waffo-signature` with embedded RSA public keys. Next.js then posts the verified event to the Go API. Event ids are unique. Quota updates take a transaction advisory lock so concurrent creates cannot pass the monthly limit.

`X-Forwarded-For` is trusted only when the API peer is localhost, which is the Next.js proxy.
