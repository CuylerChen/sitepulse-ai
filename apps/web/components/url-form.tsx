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
  buttonLabel = "Analyze",
  id = "url",
  variant = "default",
}: {
  focus: Focus;
  buttonLabel?: string;
  id?: string;
  variant?: "default" | "hero";
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

  if (variant === "hero") {
    return (
      <form onSubmit={onSubmit} className="mx-auto w-full max-w-2xl" noValidate>
        <label htmlFor={id} className="sr-only">
          Website URL
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true">
              <GlobeIcon />
            </span>
            <input
              id={id}
              name="url"
              type="text"
              inputMode="url"
              autoComplete="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="https://example.com"
              maxLength={500}
              required
              value={url}
              disabled={pending}
              onChange={(event) => setUrl(event.target.value)}
              aria-invalid={error?.code === "INVALID_URL"}
              aria-describedby={`${id}-hint`}
              className="h-12 w-full rounded-sm border border-line bg-white pl-11 pr-4 text-sm text-ink placeholder:text-muted focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-primary px-6 text-sm font-semibold text-white hover:bg-[#0b7459] disabled:opacity-60"
          >
            {pending ? "Starting…" : buttonLabel}
            <span aria-hidden="true">→</span>
          </button>
        </div>
        <p id={`${id}-hint`} className="sr-only">
          A bare domain or a full URL is fine. We check the page you submit, not your whole site.
        </p>
        <div className="mt-3 text-left">
          <ErrorNote error={error} />
        </div>
      </form>
    );
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
            placeholder="https://example.com"
            maxLength={500}
            required
            value={url}
            disabled={pending}
            onChange={(event) => setUrl(event.target.value)}
            aria-invalid={error?.code === "INVALID_URL"}
            aria-describedby={`${id}-hint`}
            className={inputClass}
          />
          <Button type="submit" disabled={pending} className="sm:min-w-36">
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

function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.8 3.8 5.8 3.8 9s-1.3 6.2-3.8 9c-2.5-2.8-3.8-5.8-3.8-9S9.5 5.8 12 3z" />
    </svg>
  );
}
