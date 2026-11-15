"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm leading-6 text-muted">We could not load this page. Try again, or return home and start a new audit.</p>
      <button type="button" onClick={reset} className="mt-6 inline-flex h-11 w-fit items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white">
        Try again
      </button>
    </main>
  );
}
