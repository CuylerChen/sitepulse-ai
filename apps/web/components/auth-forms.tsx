"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api, asApiError, safeNext, type ApiError } from "@/lib/api";
import { ErrorNote } from "@/components/error-note";
import { Button, Card, inputClass, labelClass } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(asApiError(err));
      setPending(false);
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <p className="mt-2 text-sm text-muted">Use the email on your SitePulse account.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="email" className={labelClass}>Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required value={email} disabled={pending} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required value={password} disabled={pending} onChange={(event) => setPassword(event.target.value)} className={inputClass} />
        </div>
        <ErrorNote error={error} />
        <Button type="submit" disabled={pending} className="w-full">{pending ? "Logging in…" : "Log in"}</Button>
      </form>
      <p className="mt-4 text-sm text-muted">
        New here?{" "}
        <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-primary">Create an account</Link>
      </p>
    </Card>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api("/auth/register", { method: "POST", body: JSON.stringify({ email, password, name }) });
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(asApiError(err));
      setPending(false);
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold">Create an account</h1>
      <p className="mt-2 text-sm text-muted">Save audits, websites, and your plan. A first scan does not require an account.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="name" className={labelClass}>Name</label>
          <input id="name" name="name" type="text" autoComplete="name" required maxLength={100} value={name} disabled={pending} onChange={(event) => setName(event.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required maxLength={200} value={email} disabled={pending} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required maxLength={200} value={password} disabled={pending} onChange={(event) => setPassword(event.target.value)} className={inputClass} />
        </div>
        <ErrorNote error={error} />
        <Button type="submit" disabled={pending} className="w-full">{pending ? "Creating account…" : "Create account"}</Button>
      </form>
      <p className="mt-4 text-sm text-muted">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-primary">Log in</Link>
      </p>
    </Card>
  );
}
