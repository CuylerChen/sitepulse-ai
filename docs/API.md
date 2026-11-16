# API

Base path: `/v1`

Success:

```json
{"success": true, "data": {}, "error": null, "request_id": "req_abc"}
```

Error:

```json
{"success": false, "data": null, "error": {"code": "INVALID_URL", "message": "Please enter a valid public website URL."}, "request_id": "req_abc"}
```

Cookie session: `sp_session`. Anonymous quota cookie: `sp_anon`.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | /audits | Create an audit |
| GET | /audits/{id} | Status, and the full report when complete |
| GET | /audits/{id}/result | Same payload |
| GET | /audits | History for this session |
| POST | /audits/{id}/retry | Requeue a failed audit |
| DELETE | /audits/{id} | Delete an owned audit |
| POST | /reports/{id}/share | Publish or unpublish `{ "is_public": true }` |
| DELETE | /reports/share/{token} | Revoke a public link |
| GET | /public/reports/{token} | Public projection |
| POST | /auth/register | Email and password |
| POST | /auth/login | Login |
| POST | /auth/logout | Logout |
| GET | /users/me | Current user |
| PATCH | /users/me | Name or password |
| GET | /usage | Monthly quota |
| GET | /websites | Signed-in sites |
| DELETE | /websites/{id} | Delete a site |
| GET | /billing/plans | Free, Pro, Agency |
| POST | /billing/checkout | Waffo Pancake checkout URL (Next.js, `@waffo/pancake-ts`) |
| POST | /billing/portal | Waffo customer portal link (Next.js) |
| GET | /billing/subscription | Latest subscription |
| POST | /webhooks/waffo | Internal apply path after Next.js verifies the Waffo signature |
| POST | /billing/dev-upgrade | Development only |

Public webhook deliveries must hit Next.js at `/api/webhooks/waffo` so `@waffo/pancake-ts` can verify `x-waffo-signature` on the raw body.
