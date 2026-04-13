"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { HeaderDate } from "@/components/header-date";
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

export default function SummaryBillDetailsPage() {
  const { isChecking } = useRequireWorkerSession();
  const params = useParams<{ billNumber: string }>();
  const billNumber = decodeURIComponent(params.billNumber);

  const [order, setOrder] = useState<OrderResult | null>(null);
  const [totalPaid, setTotalPaid] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isChecking) {
      return;
    }

    async function loadBill() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const supabase = getSupabaseClient();

        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select(
            "id, bill_number, customer_name, received_date, ready_date, total_amount, amount_paid, amount_pending, status, notes"
          )
          .eq("bill_number", billNumber)
          .maybeSingle<OrderResult>();

        if (orderError) {
          setErrorMessage(orderError.message || "Could not load bill.");
          return;
        }

        if (!orderData) {
          setErrorMessage("Bill not found.");
          return;
        }

        const { data: payments, error: paymentsError } = await supabase
          .from("payments")
          .select("amount")
          .eq("order_id", orderData.id)
          .returns<PaymentRow[]>();

        if (paymentsError) {
          setErrorMessage(paymentsError.message || "Could not load payment details.");
          return;
        }

        const paid = (payments ?? []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

        setOrder(orderData);
        setTotalPaid(paid);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Something went wrong. Try again."
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadBill();
  }, [billNumber, isChecking]);

  if (isChecking) {
    return null;
  }

  return (
    <main className="min-h-screen px-4 py-6">
      <section className="mx-auto w-full max-w-sm rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_rgba(31,41,55,0.12)] backdrop-blur">
        <div className="rounded-[24px] bg-brand px-5 py-6 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
            Sangeetha
          </p>
          <HeaderDate />
          <h1 className="mt-2 text-3xl font-bold leading-tight">Bill Details</h1>
          <p className="mt-3 text-base leading-6 text-white/85">
            Read-only view for bill {billNumber}.
          </p>
        </div>

        {isLoading ? (
          <div className="mt-5 rounded-[22px] bg-cream px-4 py-6 text-center text-base font-semibold text-slate-600">
            Loading bill details...
          </div>
        ) : errorMessage ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-base font-semibold text-red-700">
            {errorMessage}
          </div>
        ) : order ? (
          <div className="mt-5 space-y-3">
            <div className="rounded-[22px] bg-cream px-4 py-4 text-center">
              <p className="text-base font-semibold text-ink">Bill Found</p>
              <p className="mt-1 text-2xl font-bold text-brand">Bill {order.bill_number}</p>
            </div>

            <DetailRow label="Bill Number" value={order.bill_number} />
            <DetailRow label="Customer Name" value={order.customer_name} />
            <DetailRow label="Received Date" value={order.received_date} />
            <DetailRow label="Ready Date" value={order.ready_date || "Not set"} />
            <DetailRow label="Total Amount" value={formatCurrency(order.total_amount)} />
            <DetailRow label="Advance Paid" value={formatCurrency(order.amount_paid)} />
            <DetailRow label="Total Paid" value={formatCurrency(totalPaid)} />
            <DetailRow label="Balance Pending" value={formatCurrency(order.amount_pending)} />
            <DetailRow label="Status" value={order.status} />
            <DetailRow label="Notes" value={order.notes || "No notes"} />
          </div>
        ) : null}

        <Link
          href="/summary/today"
          className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-sand bg-white px-4 py-4 text-lg font-bold text-ink shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </Link>

        <Link
          href="/"
          className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-sand bg-white px-4 py-4 text-lg font-bold text-ink shadow-sm"
        >
          Home
        </Link>
      </section>
    </main>
  );
}
