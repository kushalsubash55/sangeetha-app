import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-6">
      <section className="w-full max-w-sm rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_rgba(31,41,55,0.12)] backdrop-blur">
        <div className="rounded-[24px] bg-brand px-5 py-6 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
            Tailor Shop
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight">Home</h1>
          <p className="mt-3 text-base leading-6 text-white/85">
            Choose one simple action.
          </p>
        </div>

        <div className="mt-5 space-y-4">
          <Link
            href="/orders/new"
            className="flex w-full items-center justify-center rounded-2xl bg-accent px-5 py-4 text-xl font-bold text-ink shadow-md"
          >
            New Order
          </Link>
          <Link
            href="/orders/search"
            className="flex w-full items-center justify-center rounded-2xl bg-brand px-5 py-4 text-xl font-bold text-white shadow-md"
          >
            Search Bill
          </Link>
        </div>
      </section>
    </main>
  );
}
