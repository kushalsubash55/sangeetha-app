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
import { HeaderDate } from "@/components/header-date";
import { HeaderHomeLink } from "@/components/header-home-link";
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
  id: string;
  delivered_at: string;
};

type SummaryState = {
  ordersReceived: number;
  ordersDelivered: number;
  cashCollected: number;
  upiCollected: number;
  totalCollected: number;
  totalPendingAmount: number;
  openBillsCount: number;
};

type LifetimeSummaryState = {
  totalCash: number;
  totalUpi: number;
  totalCollected: number;
  totalBills: number;
  totalDeliveredBills: number;
  totalOpenBills: number;
  totalPendingAmount: number;
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

type FilterKey = "today" | "yesterday" | "last7" | "month" | "custom";

const emptySummary: SummaryState = {
  ordersReceived: 0,
  ordersDelivered: 0,
  cashCollected: 0,
  upiCollected: 0,
  totalCollected: 0,
  totalPendingAmount: 0,
  openBillsCount: 0,
};

const emptyLifetimeSummary: LifetimeSummaryState = {
  totalCash: 0,
  totalUpi: 0,
  totalCollected: 0,
  totalBills: 0,
  totalDeliveredBills: 0,
  totalOpenBills: 0,
  totalPendingAmount: 0,
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

function formatDateOnly(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

function getFilterInfo(filter: FilterKey, customFromDate: string, customToDate: string) {
  const now = new Date();
  const todayStart = startOfDay(now);

  if (filter === "today") {
    return {
      label: "Today",
      start: todayStart,
      end: endOfDay(now),
      dates: [formatDateOnly(now)],
    };
  }

  if (filter === "yesterday") {
    const yesterday = new Date(todayStart);
    yesterday.setDate(yesterday.getDate() - 1);

    return {
      label: "Yesterday",
      start: yesterday,
      end: endOfDay(yesterday),
      dates: [formatDateOnly(yesterday)],
    };
  }

  if (filter === "last7") {
    const start = new Date(todayStart);
    start.setDate(start.getDate() - 6);
    const dates: string[] = [];

    for (let index = 0; index < 7; index += 1) {
      const nextDate = new Date(start);
      nextDate.setDate(start.getDate() + index);
      dates.push(formatDateOnly(nextDate));
    }

    return {
      label: "Last 7 Days",
      start,
      end: endOfDay(now),
      dates,
    };
  }

  if (filter === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const dates: string[] = [];
    const cursor = new Date(start);

    while (cursor <= now) {
      dates.push(formatDateOnly(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return {
      label: "This Month",
      start,
      end: endOfDay(now),
      dates,
    };
  }

  const fromDate = customFromDate ? new Date(`${customFromDate}T00:00:00`) : now;
  const toDate = customToDate ? new Date(`${customToDate}T00:00:00`) : fromDate;
  const safeStart = fromDate <= toDate ? fromDate : toDate;
  const safeEndBase = fromDate <= toDate ? toDate : fromDate;
  const dates: string[] = [];
  const cursor = new Date(safeStart);

  while (cursor <= safeEndBase) {
    dates.push(formatDateOnly(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    label: `${safeStart.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })} to ${safeEndBase.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`,
    start: startOfDay(safeStart),
    end: endOfDay(safeEndBase),
    dates,
  };
}

export default function DashboardPage() {
  const { isChecking } = useRequireWorkerSession();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [showRecentActivity, setShowRecentActivity] = useState(false);
  const [showOpenBills, setShowOpenBills] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>("today");
  const [customFromDate, setCustomFromDate] = useState(formatDateOnly(new Date()));
  const [customToDate, setCustomToDate] = useState(formatDateOnly(new Date()));

  useEffect(() => {
    if (isChecking) {
      return;
    }

    async function loadDashboard() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const supabase = getSupabaseClient();
        const [ordersResult, paymentsResult, deliveriesResult] = await Promise.all([
          supabase
            .from("orders")
            .select("id, bill_number, customer_name, received_date, created_at, amount_pending, status")
            .returns<OrderRow[]>(),
          supabase
            .from("payments")
            .select("amount, payment_method, payment_date, created_at, order_id, orders(bill_number, customer_name)")
            .returns<PaymentRow[]>(),
          supabase.from("deliveries").select("id, delivered_at").returns<DeliveryRow[]>(),
        ]);

        const firstError = ordersResult.error || paymentsResult.error || deliveriesResult.error;

        if (firstError) {
          setErrorMessage(firstError.message || "Could not load dashboard.");
          return;
        }

        setOrders(ordersResult.data ?? []);
        setPayments(paymentsResult.data ?? []);
        setDeliveries(deliveriesResult.data ?? []);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Something went wrong. Try again."
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, [isChecking]);

  const filterInfo = useMemo(
    () => getFilterInfo(selectedFilter, customFromDate, customToDate),
    [selectedFilter, customFromDate, customToDate]
  );

  const filteredSummary = useMemo<SummaryState>(() => {
    const filterDates = new Set(filterInfo.dates);
    const filteredOrders = orders.filter((order) => filterDates.has(order.received_date));
    const filteredPayments = payments.filter((payment) => {
      const paymentTime = new Date(payment.payment_date || payment.created_at).getTime();
      return paymentTime >= filterInfo.start.getTime() && paymentTime < filterInfo.end.getTime();
    });
    const filteredDeliveries = deliveries.filter((delivery) => {
      const deliveryTime = new Date(delivery.delivered_at).getTime();
      return deliveryTime >= filterInfo.start.getTime() && deliveryTime < filterInfo.end.getTime();
    });

    const cashCollected = filteredPayments
      .filter((payment) => payment.payment_method === "cash")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const upiCollected = filteredPayments
      .filter((payment) => payment.payment_method === "upi")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const totalPendingAmount = orders.reduce(
      (sum, order) => sum + Number(order.amount_pending || 0),
      0
    );

    const openBillsCount = orders.filter(
      (order) => order.status.trim().toUpperCase() !== "DELIVERED"
    ).length;

    return {
      ordersReceived: filteredOrders.length,
      ordersDelivered: filteredDeliveries.length,
      cashCollected,
      upiCollected,
      totalCollected: cashCollected + upiCollected,
      totalPendingAmount,
      openBillsCount,
    };
  }, [deliveries, filterInfo, orders, payments]);

  const lifetimeSummary = useMemo<LifetimeSummaryState>(() => {
    const totalCash = payments
      .filter((payment) => payment.payment_method === "cash")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const totalUpi = payments
      .filter((payment) => payment.payment_method === "upi")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const totalPendingAmount = orders.reduce(
      (sum, order) => sum + Number(order.amount_pending || 0),
      0
    );

    const totalDeliveredBills = orders.filter(
      (order) => order.status.trim().toUpperCase() === "DELIVERED"
    ).length;

    const totalOpenBills = orders.filter(
      (order) => order.status.trim().toUpperCase() !== "DELIVERED"
    ).length;

    return {
      totalCash,
      totalUpi,
      totalCollected: totalCash + totalUpi,
      totalBills: orders.length,
      totalDeliveredBills,
      totalOpenBills,
      totalPendingAmount,
    };
  }, [orders, payments]);

  const recentActivity = useMemo<ActivityItem[]>(() => {
    return payments
      .filter((payment) => {
        const paymentTime = new Date(payment.payment_date || payment.created_at).getTime();
        return paymentTime >= filterInfo.start.getTime() && paymentTime < filterInfo.end.getTime();
      })
      .map((payment) => ({
        title: `Payment ${formatCurrency(Number(payment.amount || 0))}`,
        subtitle: payment.orders?.bill_number ? `Bill ${payment.orders.bill_number}` : "Payment received",
        time: payment.payment_date || payment.created_at,
      }))
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [filterInfo, payments]);

  const openBills = useMemo<OpenBillItem[]>(() => {
    return orders
      .filter((order) => order.status.trim().toUpperCase() !== "DELIVERED")
      .sort((a, b) => Number(b.amount_pending || 0) - Number(a.amount_pending || 0))
      .map((order) => ({
        id: order.id,
        bill_number: order.bill_number,
        customer_name: order.customer_name,
        amount_pending: Number(order.amount_pending || 0),
        status: order.status,
      }));
  }, [orders]);

  if (isChecking) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-6">
      <section className="w-full max-w-sm rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_rgba(31,41,55,0.12)] backdrop-blur">
        <div className="relative rounded-[24px] bg-brand px-5 py-6 text-white">
          <HeaderHomeLink />
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
            Sangeetha
          </p>
          <HeaderDate />
          <h1 className="mt-2 text-3xl font-bold leading-tight">Dashboard</h1>
          <p className="mt-3 text-base leading-6 text-white/85">
            View {filterInfo.label.toLowerCase()} and total business numbers.
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
              Getting dashboard numbers from the database.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-5 rounded-[22px] bg-cream px-4 py-4">
              <p className="text-base font-bold text-ink">Filter</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[
                  { label: "Today", value: "today" },
                  { label: "Yesterday", value: "yesterday" },
                  { label: "Last 7 Days", value: "last7" },
                  { label: "This Month", value: "month" },
                ].map((option) => {
                  const active = selectedFilter === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedFilter(option.value as FilterKey)}
                      className={`rounded-2xl border px-3 py-3 text-base font-bold transition ${
                        active
                          ? "border-brand bg-brand text-white shadow-md"
                          : "border-sand bg-white text-ink"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setSelectedFilter("custom")}
                  className={`w-full rounded-2xl border px-3 py-3 text-base font-bold transition ${
                    selectedFilter === "custom"
                      ? "border-brand bg-brand text-white shadow-md"
                      : "border-sand bg-white text-ink"
                  }`}
                >
                  Custom Date
                </button>
              </div>

              {selectedFilter === "custom" ? (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">From</label>
                    <input
                      type="date"
                      value={customFromDate}
                      onChange={(event) => setCustomFromDate(event.target.value)}
                      className="w-full rounded-2xl border border-sand bg-white px-4 py-4 text-lg font-semibold text-ink outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">To</label>
                    <input
                      type="date"
                      value={customToDate}
                      onChange={(event) => setCustomToDate(event.target.value)}
                      className="w-full rounded-2xl border border-sand bg-white px-4 py-4 text-lg font-semibold text-ink outline-none"
                    />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">
                    You can type dates manually or use the calendar.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-[22px] bg-cream px-4 py-4 text-center">
                <p className="text-base font-semibold text-ink">{filterInfo.label}</p>
                <p className="mt-1 text-3xl font-bold text-brand">
                  {formatCurrency(filteredSummary.totalCollected)}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  Total collected for selected period
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatCard title="Orders Received" value={String(filteredSummary.ordersReceived)} />
                <StatCard title="Orders Delivered" value={String(filteredSummary.ordersDelivered)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatCard title="Cash" value={formatCurrency(filteredSummary.cashCollected)} />
                <StatCard title="UPI" value={formatCurrency(filteredSummary.upiCollected)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatCard title="Pending Now" value={formatCurrency(filteredSummary.totalPendingAmount)} />
                <StatCard title="Bills Open" value={String(filteredSummary.openBillsCount)} />
              </div>
            </div>

            <div className="mt-5 rounded-[22px] bg-white px-4 py-4 shadow-sm">
              <p className="text-lg font-bold text-ink">Lifetime Summary</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <StatCard title="Total Cash" value={formatCurrency(lifetimeSummary.totalCash)} />
                <StatCard title="Total UPI" value={formatCurrency(lifetimeSummary.totalUpi)} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <StatCard
                  title="Total Collected"
                  value={formatCurrency(lifetimeSummary.totalCollected)}
                />
                <StatCard title="Total Bills" value={String(lifetimeSummary.totalBills)} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <StatCard
                  title="Delivered Bills"
                  value={String(lifetimeSummary.totalDeliveredBills)}
                />
                <StatCard title="Open Bills" value={String(lifetimeSummary.totalOpenBills)} />
              </div>
              <div className="mt-3">
                <StatCard
                  title="Pending Amount"
                  value={formatCurrency(lifetimeSummary.totalPendingAmount)}
                />
              </div>
            </div>

            <div className="mt-5 rounded-[22px] bg-white px-4 py-4 shadow-sm">
              <p className="text-lg font-bold text-ink">Recent Activity</p>
              <button
                type="button"
                onClick={() => setShowRecentActivity((current) => !current)}
                className="mt-4 flex w-full items-center justify-between rounded-2xl border border-sand bg-cream px-4 py-4 text-left"
              >
                <span>
                  <span className="block text-base font-bold text-ink">Open Payments</span>
                  <span className="block text-sm font-semibold text-slate-600">
                    {recentActivity.length} payments in {filterInfo.label.toLowerCase()}
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
                      No payments in this period.
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
                          {new Date(payment.time).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
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
          </>
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
                  {openBills.length} open bills
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
                  <div
                    key={bill.id}
                    className="rounded-2xl border border-sand bg-cream px-4 py-4"
                  >
                    <p className="text-lg font-bold text-ink">Bill {bill.bill_number}</p>
                    <p className="mt-1 text-base font-semibold text-slate-700">
                      {bill.customer_name}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      Pending {formatCurrency(bill.amount_pending)} • {bill.status}
                    </p>
                    <Link
                      href={`/summary/bill/${encodeURIComponent(bill.bill_number)}`}
                      className="mt-3 inline-block text-sm font-bold text-brand underline underline-offset-4"
                    >
                      More Details
                    </Link>
                  </div>
                ))
              )}
            </div>
          ) : null}
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
