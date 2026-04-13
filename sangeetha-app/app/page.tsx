"use client";

import Link from "next/link";
import { LogOut, PackageCheck, ReceiptText, Search, ShoppingBag, SunMedium } from "lucide-react";
import { BigButton } from "@/components/big-button";
import { PageBrand } from "@/components/page-brand";
import { clearWorkerSession, useRequireWorkerSession } from "@/lib/session";

export default function HomePage() {
  const { isChecking, session } = useRequireWorkerSession();

  if (isChecking) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-6">
      <section className="w-full max-w-sm rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_rgba(31,41,55,0.12)] backdrop-blur">
        <div className="rounded-[24px] bg-[linear-gradient(135deg,#0d5eb8_0%,#1788e6_58%,#4fc3ff_100%)] px-5 py-6 text-white shadow-[0_16px_40px_rgba(20,121,220,0.24)]">
          <PageBrand />
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
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[linear-gradient(135deg,#1479dc_0%,#2ca8f5_100%)] px-5 py-4 text-xl font-bold text-white shadow-[0_14px_28px_rgba(20,121,220,0.28)]"
          >
            <ShoppingBag className="h-6 w-6" />
            New Order
          </Link>
          <Link
            href="/orders/search"
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[linear-gradient(135deg,#0d5eb8_0%,#1788e6_58%,#4fc3ff_100%)] px-5 py-4 text-xl font-bold text-white shadow-[0_14px_28px_rgba(20,121,220,0.24)]"
          >
            <Search className="h-6 w-6" />
            Search Bill
          </Link>
          <Link
            href="/delivery"
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-sand bg-white px-5 py-4 text-xl font-bold text-ink shadow-[0_10px_22px_rgba(22,50,79,0.1)]"
          >
            <ReceiptText className="h-6 w-6" />
            Delivery / Payment
          </Link>
          <Link
            href="/orders/pending"
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-sand bg-white px-5 py-4 text-xl font-bold text-ink shadow-[0_10px_22px_rgba(22,50,79,0.1)]"
          >
            <PackageCheck className="h-6 w-6" />
            Pending Orders
          </Link>
          <Link
            href="/summary/today"
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-sand bg-white px-5 py-4 text-xl font-bold text-ink shadow-[0_10px_22px_rgba(22,50,79,0.1)]"
          >
            <SunMedium className="h-6 w-6" />
            Today Summary
          </Link>
        </div>

        <div className="mt-5">
          <BigButton
            type="button"
            className="bg-[linear-gradient(135deg,#173358_0%,#224d82_100%)] text-white shadow-[0_14px_28px_rgba(23,51,88,0.28)]"
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
