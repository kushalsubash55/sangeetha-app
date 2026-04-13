"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ReceiptText, ShoppingBag, SunMedium, Truck, Wallet } from "lucide-react";
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
  id: string;
  type: "order" | "payment";
  title: string;
  subtitle: string;
  time: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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

        const mergedActivity: ActivityItem[] = [
          ...recentOrders.map((order) => ({
            id: `order-${order.id}`,
            type: "order" as const,
            title: `New bill ${order.bill_number}`,
            subtitle: order.customer_name,
            time: order.created_at,
          })),
          ...recentPayments.map((payment) => ({
            id: `payment-${payment.order_id}-${payment.payment_date}`,
            type: "payment" as const,
            title: `Payment ${formatCurrency(Number(payment.amount || 0))}`,
            subtitle: payment.orders?.bill_number
              ? `Bill ${payment.orders.bill_number} • ${payment.payment_method.toUpperCase()}`
              : payment.payment_method.toUpperCase(),
            time: payment.payment_date || payment.created_at,
          })),
        ]
          .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
          .slice(0, 6);

        setSummary({
          ordersReceivedToday: ordersTodayResult.count ?? 0,
          ordersDeliveredToday: deliveriesToday.length,
          cashCollectedToday,
          upiCollectedToday,
          totalCollectedToday: cashCollectedToday + upiCollectedToday,
          totalPendingAmount,
          openBillsCount,
        });
        setRecentActivity(mergedActivity);
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
              <div className="mt-4 space-y-3">
                {recentActivity.length === 0 ? (
                  <div className="rounded-2xl bg-cream px-4 py-4 text-center text-base font-semibold text-slate-600">
                    No activity today.
                  </div>
                ) : (
                  recentActivity.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-sand bg-cream px-4 py-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-white p-2 text-brand shadow-sm">
                          {item.type === "order" ? (
                            <ShoppingBag className="h-5 w-5" />
                          ) : (
                            <Wallet className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-bold text-ink">{item.title}</p>
                          <p className="text-sm font-semibold text-slate-600">{item.subtitle}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-500">
                        {new Date(item.time).toLocaleTimeString("en-IN", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white px-4 py-4 text-center shadow-sm">
            <ReceiptText className="mx-auto h-6 w-6 text-brand" />
            <p className="mt-2 text-sm font-semibold text-slate-500">Cash vs UPI</p>
            <p className="mt-1 text-lg font-bold text-ink">
              {formatCurrency(summary.cashCollectedToday)} / {formatCurrency(summary.upiCollectedToday)}
            </p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-4 text-center shadow-sm">
            <Truck className="mx-auto h-6 w-6 text-brand" />
            <p className="mt-2 text-sm font-semibold text-slate-500">Bills Still Open</p>
            <p className="mt-1 text-lg font-bold text-ink">
              {summary.openBillsCount}
            </p>
          </div>
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
