import Link from "next/link";

export default function Forbidden() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">403</p>
      <h1 className="mt-2 text-3xl font-bold">You don&apos;t have access to this page</h1>
      <p className="mt-3 text-muted">Your role doesn&apos;t include this area. Sign in with a different demo account to see it.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white">
          Back to races
        </Link>
        <Link href="/login" className="rounded-md border border-border px-4 py-2 text-sm font-semibold">
          Switch account
        </Link>
      </div>
    </div>
  );
}
