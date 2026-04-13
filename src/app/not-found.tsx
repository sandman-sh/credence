import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-5 text-center">
      <div className="surface-card-strong rounded-[2.2rem] p-10">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
          Credence
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-[var(--foreground)]">
          Agent profile not found
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          The wallet or profile you requested does not have a visible proof trail yet.
        </p>
        <Link href="/app" className="btn-dark mt-8">
          Return to app
        </Link>
      </div>
    </main>
  );
}
