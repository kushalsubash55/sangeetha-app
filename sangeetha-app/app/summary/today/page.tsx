"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ReceiptText,
  SunMedium,
  Truck,
  Wallet,
} from "lucide-react";
import { PageBrand } from "@/components/page-brand";
import { getSupabaseClient } from "@/lib/supabase";
import { useRequireWorkerSession } from "@/lib/session";
import { formatCurrency } from "@/lib/utils";

type OrderRow = {
  id: string;
  bill_number: string;
  customer_name: string;
  received_date: string;
  created_at: string;
  total_amount: number;
  amount_pending: number;
  status: string;
  created_by: string | null;
};

type PaymentRow = {
  amount: number;
  payment_method: "cash" | "upi";
  payment_type: "advance" | "partial" | "full";
  payment_date: string;
  created_at: string;
  order_id: string;
  recorded_by: string | null;
  orders: {
    bill_number: string;
    customer_name: string;
  } | null;
};

type DeliveryRow = {
  id: string;
  delivered_at: string;
  order_id: string;
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

type ActivityEntry = {
  billNumber: string;
  customerName: string;
  action: string;
  amountText: string | null;
  paymentModeText: string | null;
  time: string;
  workerLabel: string | null;
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
      showing: now.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
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
      showing: yesterday.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
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
      showing: `${start.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })} - ${now.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`,
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
      showing: now.toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      }),
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
    showing: `${safeStart.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })} - ${safeEndBase.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`,
    start: startOfDay(safeStart),
    end: endOfDay(safeEndBase),
    dates,
  };
}

function formatWorkerId(workerId: string | null) {
  if (!workerId) {
    return null;
  }

  return `Worker ${workerId.slice(0, 8)}`;
}

export default function DashboardPage() {
  const { isChecking } = useRequireWorkerSession();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [openActivitySections, setOpenActivitySections] = useState({
    payments: false,
    created: false,
    delivered: false,
  });
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
            .select(
              "id, bill_number, customer_name, received_date, created_at, total_amount, amount_pending, status, created_by"
            )
            .returns<OrderRow[]>(),
          supabase
            .from("payments")
            .select(
              "amount, payment_method, payment_type, payment_date, created_at, order_id, recorded_by, orders(bill_number, customer_name)"
            )
            .returns<PaymentRow[]>(),
          supabase.from("deliveries").select("id, delivered_at, order_id").returns<DeliveryRow[]>(),
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

  const filteredPaymentsActivity = useMemo<ActivityEntry[]>(() => {
    return payments
      .filter((payment) => {
        const paymentTime = new Date(payment.payment_date || payment.created_at).getTime();
        return paymentTime >= filterInfo.start.getTime() && paymentTime < filterInfo.end.getTime();
      })
      .map((payment) => ({
        billNumber: payment.orders?.bill_number ?? "-",
        customerName: payment.orders?.customer_name ?? "No customer name",
        action: payment.payment_type === "full" ? "Fully Paid" : "Paid",
        amountText: formatCurrency(Number(payment.amount || 0)),
        paymentModeText: payment.payment_method.toUpperCase(),
        time: payment.payment_date || payment.created_at,
        workerLabel: formatWorkerId(payment.recorded_by),
      }))
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [filterInfo, payments]);

  const filteredCreatedOrdersActivity = useMemo<ActivityEntry[]>(() => {
    return orders
      .filter((order) => {
        const orderTime = new Date(order.created_at).getTime();
        return orderTime >= filterInfo.start.getTime() && orderTime < filterInfo.end.getTime();
      })
      .map((order) => ({
        billNumber: order.bill_number,
        customerName: order.customer_name,
        action: "Created",
        amountText: formatCurrency(Number(order.total_amount || 0)),
        paymentModeText: null,
        time: order.created_at,
        workerLabel: formatWorkerId(order.created_by),
      }))
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [filterInfo, orders]);

  const filteredDeliveredActivity = useMemo<ActivityEntry[]>(() => {
    const deliveredOrderIds = new Set(
      deliveries
        .filter((delivery) => {
          const deliveryTime = new Date(delivery.delivered_at).getTime();
          return deliveryTime >= filterInfo.start.getTime() && deliveryTime < filterInfo.end.getTime();
        })
        .map((delivery) => delivery.order_id)
    );

    return payments
      .filter(
        (payment) =>
          payment.payment_type === "full" &&
          deliveredOrderIds.has(payment.order_id)
      )
      .map((payment) => ({
        billNumber: payment.orders?.bill_number ?? "-",
        customerName: payment.orders?.customer_name ?? "No customer name",
        action: "Fully Paid / Delivered",
        amountText: formatCurrency(Number(payment.amount || 0)),
        paymentModeText: payment.payment_method.toUpperCase(),
        time: payment.payment_date || payment.created_at,
        workerLabel: formatWorkerId(payment.recorded_by),
      }))
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [deliveries, filterInfo, payments]);

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

  function toggleActivitySection(section: keyof typeof openActivitySections) {
    setOpenActivitySections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  function ActivitySection({
    sectionKey,
    title,
    subtitle,
    items,
    emptyText,
    icon,
  }: {
    sectionKey: keyof typeof openActivitySections;
    title: string;
    subtitle: string;
    items: ActivityEntry[];
    emptyText: string;
    icon: ReactNode;
  }) {
    const isOpen = openActivitySections[sectionKey];

    return (
      <div className="rounded-2xl border border-sand bg-cream px-4 py-4">
        <button
          type="button"
          onClick={() => toggleActivitySection(sectionKey)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-3">
            <span className="rounded-xl bg-white p-2 text-brand shadow-sm">{icon}</span>
            <span>
              <span className="block text-base font-bold text-ink">{title}</span>
              <span className="block text-sm font-semibold text-slate-600">{subtitle}</span>
            </span>
          </span>
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-ink" />
          ) : (
            <ChevronDown className="h-5 w-5 text-ink" />
          )}
        </button>

        {isOpen ? (
          <div className="mt-3 space-y-3">
            {items.length === 0 ? (
              <div className="rounded-2xl bg-white px-4 py-4 text-center text-base font-semibold text-slate-600">
                {emptyText}
              </div>
            ) : (
              items.map((item, index) => (
                <Link
                  key={`${sectionKey}-${item.billNumber}-${item.time}-${index}`}
                  href={`/summary/bill/${encodeURIComponent(item.billNumber)}`}
                  className="block rounded-2xl border border-sand bg-white px-4 py-4 shadow-sm"
                >
                  <p className="text-base font-bold text-ink">
                    Bill {item.billNumber} | {item.customerName}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {item.action}
                    {item.amountText ? ` | ${item.amountText}` : ""}
                    {item.paymentModeText ? ` by ${item.paymentModeText}` : ""}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    {new Date(item.time).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                  {item.workerLabel ? (
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      {item.workerLabel}
                    </p>
                  ) : null}
                </Link>
              ))
            )}
          </div>
        ) : null}
      </div>
    );
  }

  if (isChecking) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-6">
      <section className="w-full max-w-sm rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_rgba(31,41,55,0.12)] backdrop-blur">
        <div className="rounded-[24px] bg-[linear-gradient(135deg,#0d5eb8_0%,#1788e6_58%,#4fc3ff_100%)] px-5 py-6 text-white shadow-[0_16px_40px_rgba(20,121,220,0.24)]">
          <PageBrand showHome />
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

              <p className="mt-4 text-sm font-semibold text-slate-600">
                Showing: {filterInfo.showing}
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-[22px] bg-cream px-4 py-4 text-center">
                <p className="text-base font-semibold text-ink">Total Collection</p>
                <p className="mt-1 text-3xl font-bold text-brand">
                  {formatCurrency(filteredSummary.totalCollected)}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  For selected filter
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatCard title="Received Today" value={String(filteredSummary.ordersReceived)} />
                <StatCard title="Delivered Today" value={String(filteredSummary.ordersDelivered)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatCard title="Cash" value={formatCurrency(filteredSummary.cashCollected)} />
                <StatCard title="UPI" value={formatCurrency(filteredSummary.upiCollected)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatCard title="Pending Amount" value={formatCurrency(filteredSummary.totalPendingAmount)} />
                <StatCard title="Open Bills" value={String(filteredSummary.openBillsCount)} />
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
              <p className="mt-2 text-sm font-semibold text-slate-600">
                Expand any section to see all bills for the selected filter.
              </p>
              <div className="mt-4 space-y-3">
                <ActivitySection
                  sectionKey="payments"
                  title="Payments for selected filter"
                  subtitle={`${filteredPaymentsActivity.length} bills`}
                  items={filteredPaymentsActivity}
                  emptyText="No payments found for this filter."
                  icon={<Wallet className="h-5 w-5" />}
                />
                <ActivitySection
                  sectionKey="created"
                  title="Orders created for selected filter"
                  subtitle={`${filteredCreatedOrdersActivity.length} bills`}
                  items={filteredCreatedOrdersActivity}
                  emptyText="No new orders found for this filter."
                  icon={<ReceiptText className="h-5 w-5" />}
                />
                <ActivitySection
                  sectionKey="delivered"
                  title="Fully paid / delivered bills for selected filter"
                  subtitle={`${filteredDeliveredActivity.length} bills`}
                  items={filteredDeliveredActivity}
                  emptyText="No fully paid or delivered bills found for this filter."
                  icon={<CheckCircle2 className="h-5 w-5" />}
                />
              </div>
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
            Home
          </Link>
        </div>
      </section>
    </main>
  );
}
