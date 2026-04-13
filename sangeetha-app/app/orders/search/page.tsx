"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ReceiptText,
  Search,
} from "lucide-react";
import { BigButton } from "@/components/big-button";
import { HeaderDate } from "@/components/header-date";
import { HeaderHomeLink } from "@/components/header-home-link";
import { InputField } from "@/components/input-field";
import { getSupabaseClient } from "@/lib/supabase";
import { useRequireWorkerSession } from "@/lib/session";
import { formatCurrency } from "@/lib/utils";

type OrderResult = {
  id: string;
  bill_number: string;
  customer_name: string;
  received_date: string;
  ready_date: string | null;
  total_amount: number;
  amount_paid: number;
  amount_pending: number;
  status: string;
  notes: string | null;
};

type PaymentRow = {
  amount: number;
};

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-sand bg-white px-4 py-4 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-ink">{value}</p>
    </div>
  );
}

function SearchOrderPageContent() {
  const { isChecking } = useRequireWorkerSession();
  const searchParams = useSearchParams();
  const billFromUrl = searchParams.get("bill") ?? "";
  const [billNumber, setBillNumber] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notFoundMessage, setNotFoundMessage] = useState("");
  const [result, setResult] = useState<OrderResult | null>(null);
  const [totalPaid, setTotalPaid] = useState(0);

  async function runSearch(rawBillNumber: string) {
    setErrorMessage("");
    setNotFoundMessage("");
    setResult(null);
    setTotalPaid(0);

    if (!rawBillNumber.trim()) {
      setErrorMessage("Enter bill number.");
      return;
    }

    setIsSearching(true);

    try {
      const supabase = getSupabaseClient();

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(
          "id, bill_number, customer_name, received_date, ready_date, total_amount, amount_paid, amount_pending, status, notes"
        )
        .eq("bill_number", rawBillNumber.trim())
        .maybeSingle<OrderResult>();

      if (orderError) {
        setErrorMessage(orderError.message || "Could not search order.");
        return;
      }

      if (!order) {
        setNotFoundMessage("Bill number not found.");
        return;
      }

      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("amount")
        .eq("order_id", order.id)
        .returns<PaymentRow[]>();

      if (paymentsError) {
        setErrorMessage(paymentsError.message || "Could not load payment details.");
        return;
      }

      const paid = (payments ?? []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

      setResult(order);
      setTotalPaid(paid);
    } catch (error) {
      console.error("Order search failed", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong. Try again."
      );
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runSearch(billNumber);
  }

  useEffect(() => {
    if (!billFromUrl) {
      return;
    }

    setBillNumber(billFromUrl);
    void runSearch(billFromUrl);
  }, [billFromUrl]);

  if (isChecking) {
    return null;
  }

  return (
    <main className="min-h-screen px-4 py-6">
      <section className="mx-auto w-full max-w-sm rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_rgba(31,41,55,0.12)] backdrop-blur">
        <div className="relative rounded-[24px] bg-brand px-5 py-6 text-white">
          <HeaderHomeLink />
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
            Sangeetha
          </p>
          <HeaderDate />
          <h1 className="mt-2 text-3xl font-bold leading-tight">Search Bill</h1>
          <p className="mt-3 text-base leading-6 text-white/85">
            Enter bill number and see order details.
          </p>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSearch}>
          <InputField
            label="Bill Number"
            name="billNumber"
            placeholder="Enter bill number"
            value={billNumber}
            onChange={(event) => setBillNumber(event.target.value)}
            icon={<ReceiptText className="h-6 w-6" />}
          />

          {errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-base font-semibold text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {notFoundMessage ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-base font-semibold text-amber-800">
              {notFoundMessage}
            </div>
          ) : null}

          <BigButton type="submit" disabled={isSearching} className={isSearching ? "opacity-70" : ""}>
            <Search className="h-6 w-6" />
            {isSearching ? "Searching..." : "Search"}
          </BigButton>
        </form>

        {result ? (
          <div className="mt-5 space-y-3">
            <div className="rounded-[22px] bg-cream px-4 py-4 text-center">
              <p className="text-base font-semibold text-ink">Order Found</p>
              <p className="mt-1 text-2xl font-bold text-brand">Bill {result.bill_number}</p>
            </div>

            <DetailRow label="Bill Number" value={result.bill_number} />
            <DetailRow label="Customer Name" value={result.customer_name} />
            <DetailRow label="Received Date" value={result.received_date} />
            <DetailRow label="Ready Date" value={result.ready_date || "Not set"} />
            <DetailRow label="Total Amount" value={formatCurrency(result.total_amount)} />
            <DetailRow label="Advance Paid" value={formatCurrency(result.amount_paid)} />
            <DetailRow label="Total Paid" value={formatCurrency(totalPaid)} />
            <DetailRow label="Balance Pending" value={formatCurrency(result.amount_pending)} />
            <DetailRow label="Status" value={result.status} />
            <DetailRow label="Notes" value={result.notes || "No notes"} />
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-2xl border border-sand bg-white px-4 py-4 text-lg font-bold text-ink shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </Link>
          {result ? (
            <Link
              href={`/delivery?bill=${encodeURIComponent(result.bill_number)}`}
              className="flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-4 text-lg font-bold text-ink shadow-sm"
            >
              <ArrowRight className="h-5 w-5" />
              Delivery
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-4 text-lg font-bold text-ink opacity-70 shadow-sm"
            >
              <ArrowRight className="h-5 w-5" />
              Delivery
            </button>
          )}
        </div>

        <div className="mt-3 rounded-2xl bg-cream px-4 py-4 text-center text-sm font-semibold text-slate-600">
          Open Delivery after finding the order.
        </div>

      </section>
    </main>
  );
}

export default function SearchOrderPage() {
  return (
    <Suspense>
      <SearchOrderPageContent />
    </Suspense>
  );
}
