"use client";

import { useState } from "react";
import { api, asApiError, type ApiError } from "@/lib/api";
import { ErrorNote } from "@/components/error-note";
import { Button, inputClass, labelClass } from "@/components/ui";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api("/contact", { method: "POST", body: JSON.stringify({ name, email, message }) });
      setSent(true);
    } catch (err) {
      setError(asApiError(err));
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-success">
        Thanks. We received your message and will reply by email.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="name" className={labelClass}>Name</label>
        <input id="name" name="name" autoComplete="name" required maxLength={100} value={name} disabled={pending} onChange={(event) => setName(event.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="email" className={labelClass}>Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required maxLength={200} value={email} disabled={pending} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="message" className={labelClass}>Message</label>
        <textarea id="message" name="message" required maxLength={5000} rows={6} value={message} disabled={pending} onChange={(event) => setMessage(event.target.value)} className="w-full rounded-xl border border-line px-3 py-2 text-sm text-ink disabled:bg-page" />
      </div>
      <ErrorNote error={error} />
      <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Send message"}</Button>
    </form>
  );
}
