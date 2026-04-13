"use client";

import Link from "next/link";
import { ArrowLeft, PackageCheck } from "lucide-react";
import { HeaderDate } from "@/components/header-date";
import { HeaderHomeLink } from "@/components/header-home-link";
import { useRequireWorkerSession } from "@/lib/session";

export default function PendingOrdersPlaceholderPage() {
  const { isChecking } = useRequireWorkerSession();

  if (isChecking) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-6">
      <section className="w-full max-w-sm rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_rgba(31,41,55,0.12)] backdrop-blur">
        <div className="rounded-[24px] bg-brand px-5 py-6 text-white">
          <div className="mb-2 flex items-start gap-3">
            <HeaderHomeLink />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
                Sangeetha
              </p>
              <div className="mt-2">
                <HeaderDate />
              </div>
            </div>
          </div>
          <h1 className="mt-2 text-3xl font-bold leading-tight">Pending Orders</h1>
          <p className="mt-3 text-base leading-6 text-white/85">
            This screen will be added next.
          </p>
        </div>

        <div className="mt-5 rounded-[22px] bg-cream px-4 py-6 text-center">
          <PackageCheck className="mx-auto h-10 w-10 text-brand" />
          <p className="mt-3 text-xl font-bold text-ink">Coming Soon</p>
          <p className="mt-2 text-base leading-6 text-slate-600">
            You will see all unpaid and not delivered bills here.
          </p>
        </div>

        <div className="mt-5">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-2xl border border-sand bg-white px-4 py-4 text-lg font-bold text-ink shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </Link>
        </div>
      </section>
    </main>
  );
}
