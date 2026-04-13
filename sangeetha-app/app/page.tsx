"use client";

import Link from "next/link";
import { LogOut, PackageCheck, ReceiptText, Search, ShoppingBag, SunMedium } from "lucide-react";
import { BigButton } from "@/components/big-button";
import { HeaderDate } from "@/components/header-date";
import { clearWorkerSession, useRequireWorkerSession } from "@/lib/session";

export default function HomePage() {
  const { isChecking, session } = useRequireWorkerSession();

  if (isChecking) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-6">
      <section className="w-full max-w-sm rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_rgba(31,41,55,0.12)] backdrop-blur">
        <div className="rounded-[24px] bg-brand px-5 py-6 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
            Sangeetha
          </p>
          <HeaderDate />
          <h1 className="mt-2 text-3xl font-bold leading-tight">Home</h1>
          <p className="mt-3 text-base leading-6 text-white/85">
            Choose one simple action.
          </p>
          <p className="mt-3 text-sm font-semibold text-white/80">
            Worker: {session?.phone}
          </p>
        </div>

        <div className="mt-5 space-y-4">
          <Link
            href="/orders/new"
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-accent px-5 py-4 text-xl font-bold text-ink shadow-md"
          >
            <ShoppingBag className="h-6 w-6" />
            New Order
          </Link>
          <Link
            href="/orders/search"
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-brand px-5 py-4 text-xl font-bold text-white shadow-md"
          >
            <Search className="h-6 w-6" />
            Search Bill
          </Link>
          <Link
            href="/delivery"
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 text-xl font-bold text-ink shadow-md"
          >
            <ReceiptText className="h-6 w-6" />
            Delivery / Payment
          </Link>
          <Link
            href="/orders/pending"
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 text-xl font-bold text-ink shadow-md"
          >
            <PackageCheck className="h-6 w-6" />
            Pending Orders
          </Link>
          <Link
            href="/summary/today"
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 text-xl font-bold text-ink shadow-md"
          >
            <SunMedium className="h-6 w-6" />
            Today Summary
          </Link>
        </div>

        <div className="mt-5">
          <BigButton
            type="button"
            className="bg-slate-800 text-white"
            onClick={() => {
              clearWorkerSession();
              window.location.href = "/login";
            }}
          >
            <LogOut className="h-6 w-6" />
            Logout
          </BigButton>
        </div>
      </section>
    </main>
  );
}
