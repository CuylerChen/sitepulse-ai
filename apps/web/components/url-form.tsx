"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, asApiError, normalizeUrl } from "@/lib/api";
import type { ApiError } from "@/lib/api";
import type { AuditCreate, Focus } from "@/lib/types";
import { ErrorNote } from "@/components/error-note";
import { Button, inputClass, labelClass } from "@/components/ui";

export function UrlForm({
  focus,
  buttonLabel = "Run free audit",
  id = "url",
}: {
  focus: Focus;
  buttonLabel?: string;
  id?: string;
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setError({ name: "ApiError", message: "Enter a website address.", code: "INVALID_URL" } as ApiError);
      return;
    }
    setPending(true);
    try {
      const data = await api<AuditCreate>("/audits", {
        method: "POST",
        body: JSON.stringify({ url: normalized, focus }),
      });
      const eta = Number.isFinite(data.estimated_seconds) ? `?eta=${data.estimated_seconds}` : "";
      router.push(`/audits/${data.audit_id}${eta}`);
    } catch (err) {
      setError(asApiError(err));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <div>
        <label htmlFor={id} className={labelClass}>
          Website address
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id={id}
            name="url"
            type="text"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="yourstore.com"
            maxLength={500}
            required
            value={url}
            disabled={pending}
            onChange={(event) => setUrl(event.target.value)}
            aria-invalid={error?.code === "INVALID_URL"}
            aria-describedby={`${id}-hint`}
            className={inputClass}
          />
          <Button type="submit" disabled={pending} className="sm:min-w-40">
            {pending ? "Starting…" : buttonLabel}
          </Button>
        </div>
        <p id={`${id}-hint`} className="mt-2 text-sm text-muted">
          A bare domain or a full URL is fine. We check the page you submit, not your whole site.
        </p>
      </div>
      <ErrorNote error={error} />
    </form>
  );
}
