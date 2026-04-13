"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  SunMedium,
  Truck,
  Wallet,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { useRequireWorkerSession } from "@/lib/session";
import { formatCurrency } from "@/lib/utils";

type OrderRow = {
  id: string;
  bill_number: string;
  customer_name: string;
  received_date: string;
  created_at: string;
  amount_pending: number;
  status: string;
};

type PaymentRow = {
  amount: number;
  payment_method: "cash" | "upi";
  payment_date: string;
  created_at: string;
  order_id: string;
  orders: {
    bill_number: string;
    customer_name: string;
  } | null;
};

type DeliveryRow = {
  delivered_at: string;
};

type SummaryState = {
  ordersReceivedToday: number;
  ordersDeliveredToday: number;
  cashCollectedToday: number;
  upiCollectedToday: number;
  totalCollectedToday: number;
  totalPendingAmount: number;
  openBillsCount: number;
};

type ActivityItem = {
  title: string;
  subtitle: string;
  time: string;
};

type OpenBillItem = {
  id: string;
  bill_number: string;
  customer_name: string;
  amount_pending: number;
  status: string;
};

const emptySummary: SummaryState = {
  ordersReceivedToday: 0,
  ordersDeliveredToday: 0,
  cashCollectedToday: 0,
  upiCollectedToday: 0,
  totalCollectedToday: 0,
  totalPendingAmount: 0,
  openBillsCount: 0,
};

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-sand bg-white px-4 py-4 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
    </div>
  );
}

export default function TodaySummaryPlaceholderPage() {
  const { isChecking } = useRequireWorkerSession();
  const [summary, setSummary] = useState<SummaryState>(emptySummary);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [openBills, setOpenBills] = useState<OpenBillItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [showRecentActivity, setShowRecentActivity] = useState(false);
  const [showOpenBills, setShowOpenBills] = useState(false);

  const todayInfo = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    return {
      localDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
        now.getDate()
      ).padStart(2, "0")}`,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      label: now.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };
  }, []);

  useEffect(() => {
    if (isChecking) {
      return;
    }

    async function loadSummary() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const supabase = getSupabaseClient();

        const [
          ordersTodayResult,
          deliveriesTodayResult,
          paymentsTodayResult,
          allOrdersResult,
          recentOrdersResult,
          recentPaymentsResult,
        ] = await Promise.all([
          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("received_date", todayInfo.localDate),
          supabase
            .from("deliveries")
            .select("delivered_at")
            .gte("delivered_at", todayInfo.startIso)
            .lt("delivered_at", todayInfo.endIso)
            .returns<DeliveryRow[]>(),
          supabase
            .from("payments")
            .select("amount, payment_method, payment_date, created_at, order_id, orders(bill_number, customer_name)")
            .gte("payment_date", todayInfo.startIso)
            .lt("payment_date", todayInfo.endIso)
            .returns<PaymentRow[]>(),
          supabase
            .from("orders")
            .select("id, bill_number, customer_name, received_date, created_at, amount_pending, status")
            .returns<OrderRow[]>(),
          supabase
            .from("orders")
            .select("id, bill_number, customer_name, received_date, created_at")
            .eq("received_date", todayInfo.localDate)
            .order("created_at", { ascending: false })
            .limit(5)
            .returns<Pick<OrderRow, "id" | "bill_number" | "customer_name" | "received_date" | "created_at">[]>(),
          supabase
            .from("payments")
            .select("amount, payment_method, payment_date, created_at, order_id, orders(bill_number, customer_name)")
            .gte("payment_date", todayInfo.startIso)
            .lt("payment_date", todayInfo.endIso)
            .order("payment_date", { ascending: false })
            .limit(5)
            .returns<PaymentRow[]>(),
        ]);

        const firstError =
          ordersTodayResult.error ||
          deliveriesTodayResult.error ||
          paymentsTodayResult.error ||
          allOrdersResult.error ||
          recentOrdersResult.error ||
          recentPaymentsResult.error;

        if (firstError) {
          setErrorMessage(firstError.message || "Could not load today summary.");
          return;
        }

        const paymentsToday = paymentsTodayResult.data ?? [];
        const deliveriesToday = deliveriesTodayResult.data ?? [];
        const allOrders = allOrdersResult.data ?? [];
        const recentOrders = recentOrdersResult.data ?? [];
        const recentPayments = recentPaymentsResult.data ?? [];

        const cashCollectedToday = paymentsToday
          .filter((payment) => payment.payment_method === "cash")
          .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

        const upiCollectedToday = paymentsToday
          .filter((payment) => payment.payment_method === "upi")
          .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

        const totalPendingAmount = allOrders.reduce(
          (sum, order) => sum + Number(order.amount_pending || 0),
          0
        );

        const openBillsCount = allOrders.filter(
          (order) => order.status.trim().toUpperCase() !== "DELIVERED"
        ).length;

        const openBillItems: OpenBillItem[] = allOrders
          .filter((order) => order.status.trim().toUpperCase() !== "DELIVERED")
          .sort((a, b) => Number(b.amount_pending || 0) - Number(a.amount_pending || 0))
          .map((order) => ({
            id: order.id,
            bill_number: order.bill_number,
            customer_name: order.customer_name,
            amount_pending: Number(order.amount_pending || 0),
            status: order.status,
          }));

        const paymentActivity: ActivityItem[] = paymentsToday
          .map((payment) => ({
            title: `Payment ${formatCurrency(Number(payment.amount || 0))}`,
            subtitle: payment.orders?.bill_number
              ? `Bill ${payment.orders.bill_number}`
              : "Payment received",
            time: payment.payment_date || payment.created_at,
          }))
          .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        setSummary({
          ordersReceivedToday: ordersTodayResult.count ?? 0,
          ordersDeliveredToday: deliveriesToday.length,
          cashCollectedToday,
          upiCollectedToday,
          totalCollectedToday: cashCollectedToday + upiCollectedToday,
          totalPendingAmount,
          openBillsCount,
        });
        setRecentActivity(paymentActivity);
        setOpenBills(openBillItems);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Something went wrong. Try again."
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadSummary();
  }, [isChecking, todayInfo]);

  if (isChecking) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-6">
      <section className="w-full max-w-sm rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_rgba(31,41,55,0.12)] backdrop-blur">
        <div className="rounded-[24px] bg-brand px-5 py-6 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
            Tailor Shop
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight">Today Summary</h1>
          <p className="mt-3 text-base leading-6 text-white/85">
            Summary for {todayInfo.label}
          </p>
        </div>

        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-base font-semibold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-5 rounded-[22px] bg-cream px-4 py-6 text-center">
            <SunMedium className="mx-auto h-10 w-10 text-brand" />
            <p className="mt-3 text-xl font-bold text-ink">Loading</p>
            <p className="mt-2 text-base leading-6 text-slate-600">
              Getting today&apos;s numbers from the database.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard title="Orders Received" value={String(summary.ordersReceivedToday)} />
              <StatCard title="Orders Delivered" value={String(summary.ordersDeliveredToday)} />
            </div>

            <div className="rounded-[22px] bg-cream px-4 py-4 text-center">
              <p className="text-base font-semibold text-ink">Total Collected Today</p>
              <p className="mt-1 text-3xl font-bold text-brand">
                {formatCurrency(summary.totalCollectedToday)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard title="Cash Today" value={formatCurrency(summary.cashCollectedToday)} />
              <StatCard title="UPI Today" value={formatCurrency(summary.upiCollectedToday)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard title="Pending Amount" value={formatCurrency(summary.totalPendingAmount)} />
              <StatCard title="Bills Still Open" value={String(summary.openBillsCount)} />
            </div>

            <div className="rounded-[22px] bg-white px-4 py-4 shadow-sm">
              <p className="text-lg font-bold text-ink">Recent Activity</p>
              <button
                type="button"
                onClick={() => setShowRecentActivity((current) => !current)}
                className="mt-4 flex w-full items-center justify-between rounded-2xl border border-sand bg-cream px-4 py-4 text-left"
              >
                <span>
                  <span className="block text-base font-bold text-ink">Open Recent Payments</span>
                  <span className="block text-sm font-semibold text-slate-600">
                    {recentActivity.length} payments today
                  </span>
                </span>
                {showRecentActivity ? (
                  <ChevronUp className="h-5 w-5 text-ink" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-ink" />
                )}
              </button>

              {showRecentActivity ? (
                <div className="mt-3 space-y-3">
                  {recentActivity.length === 0 ? (
                    <div className="rounded-2xl bg-cream px-4 py-4 text-center text-base font-semibold text-slate-600">
                      No payments today.
                    </div>
                  ) : (
                    recentActivity.map((payment, index) => (
                      <div
                        key={`${payment.title}-${payment.time}-${index}`}
                        className="rounded-2xl border border-sand bg-cream px-4 py-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-white p-2 text-brand shadow-sm">
                            <Wallet className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-bold text-ink">{payment.title}</p>
                            <p className="text-sm font-semibold text-slate-600">
                              {payment.subtitle}
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-500">
                          {new Date(payment.time).toLocaleTimeString("en-IN", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}

        <div className="mt-5 space-y-3">
          <button
            type="button"
            onClick={() => setShowOpenBills((current) => !current)}
            className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-4 text-left shadow-sm"
          >
            <span className="flex items-center gap-3">
              <Truck className="h-6 w-6 text-brand" />
              <span>
                <span className="block text-base font-bold text-ink">Bills Still Open</span>
                <span className="block text-sm font-semibold text-slate-600">
                  {summary.openBillsCount} open bills
                </span>
              </span>
            </span>
            {showOpenBills ? (
              <ChevronUp className="h-5 w-5 text-ink" />
            ) : (
              <ChevronDown className="h-5 w-5 text-ink" />
            )}
          </button>

          {showOpenBills ? (
            <div className="space-y-3 rounded-[22px] bg-white px-4 py-4 shadow-sm">
              <p className="text-lg font-bold text-ink">Open Bills</p>
              {openBills.length === 0 ? (
                <div className="rounded-2xl bg-cream px-4 py-4 text-center text-base font-semibold text-slate-600">
                  No open bills.
                </div>
              ) : (
                openBills.map((bill) => (
                  <Link
                    key={bill.id}
                    href={`/summary/bill/${encodeURIComponent(bill.bill_number)}`}
                    className="block rounded-2xl border border-sand bg-cream px-4 py-4"
                  >
                    <p className="text-lg font-bold text-ink">Bill {bill.bill_number}</p>
                    <p className="mt-1 text-base font-semibold text-slate-700">
                      {bill.customer_name}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      Pending {formatCurrency(bill.amount_pending)} • {bill.status}
                    </p>
                  </Link>
                ))
              )}
            </div>
          ) : null}
        </div>

        <Link
          href="/"
          className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-sand bg-white px-4 py-4 text-lg font-bold text-ink shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
          Home
        </Link>
      </section>
    </main>
  );
}
