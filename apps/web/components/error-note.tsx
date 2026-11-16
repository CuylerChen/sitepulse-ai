import Link from "next/link";
import type { ApiError } from "@/lib/api";

export function ErrorNote({ error }: { error: ApiError | null }) {
  if (!error) return null;
  const quota = error.code === "QUOTA_EXCEEDED";
  return (
    <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-error">
      <p>{error.message}</p>
      {quota ? (
        <p className="mt-1 text-ink">
          <Link href="/pricing" className="font-semibold text-primary">
            Compare plans
          </Link>
          <span className="text-muted"> · </span>
          <Link href="/register" className="font-semibold text-primary">
            Create a free account
          </Link>
        </p>
      ) : null}
    </div>
  );
}
