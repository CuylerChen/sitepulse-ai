"use client";

import { useEffect, useState } from "react";
import { ApiError, api, asApiError } from "@/lib/api";
import type { User } from "@/lib/types";
import { ErrorNote } from "@/components/error-note";
import { Button, Card, Spinner, inputClass, labelClass } from "@/components/ui";

export function SettingsClient() {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api<User>("/users/me")
      .then((me) => {
        setUser(me);
        setName(me.name || "");
      })
      .catch((err) => setError(asApiError(err)));
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    const body: { name?: string; current_password?: string; new_password?: string } = {};
    if (name.trim() && name.trim() !== user?.name) body.name = name.trim();
    if (newPassword) {
      body.current_password = currentPassword;
      body.new_password = newPassword;
    }
    if (!body.name && !body.new_password) {
      setError(new ApiError("Change your name or enter a new password.", "INVALID_INPUT"));
      setPending(false);
      return;
    }
    try {
      const updated = await api<User>("/users/me", { method: "PATCH", body: JSON.stringify(body) });
      setUser(updated);
      setName(updated.name || name);
      setCurrentPassword("");
      setNewPassword("");
      setNotice("Saved.");
    } catch (err) {
      setError(asApiError(err));
    } finally {
      setPending(false);
    }
  }

  if (!user && !error) return <Spinner label="Loading settings…" />;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className={labelClass}>Email</label>
            <input id="email" name="email" value={user?.email || ""} readOnly className={`${inputClass} bg-page`} />
          </div>
          <div>
            <label htmlFor="name" className={labelClass}>Name</label>
            <input id="name" name="name" autoComplete="name" required maxLength={100} value={name} disabled={pending} onChange={(event) => setName(event.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="current-password" className={labelClass}>Current password</label>
            <input id="current-password" name="current-password" type="password" autoComplete="current-password" value={currentPassword} disabled={pending} onChange={(event) => setCurrentPassword(event.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="new-password" className={labelClass}>New password</label>
            <input id="new-password" name="new-password" type="password" autoComplete="new-password" maxLength={200} value={newPassword} disabled={pending} onChange={(event) => setNewPassword(event.target.value)} className={inputClass} />
            <p className="mt-1 text-xs text-muted">Leave the password fields blank if you only want to change your name.</p>
          </div>
          <ErrorNote error={error} />
          {notice ? <p className="text-sm text-success">{notice}</p> : null}
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
        </form>
      </Card>
    </div>
  );
}
