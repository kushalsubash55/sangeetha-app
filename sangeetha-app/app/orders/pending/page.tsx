"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, ChevronDown, Clock3, ReceiptText, Search } from "lucide-react";
import { BigButton } from "@/components/big-button";
import { InputField } from "@/components/input-field";
import { PageBrand } from "@/components/page-brand";
import { useAutoScrollToMessage } from "@/lib/form-feedback";
import { useStatusLabel, useTranslation } from "@/lib/i18n";
import { useRequireWorkerSession } from "@/lib/session";
import { getSupabaseClient } from "@/lib/supabase";
import { formatCurrency, formatUiDate } from "@/lib/utils";

type PendingOrder = {
  id: string;
  bill_number: string;
  customer_name: string;
  received_date: string;
  ready_date: string | null;
  total_amount: number;
  amount_paid: number;
  amount_pending: number;
  status: string;
};

function formatDisplayDate(value: string | null, fallback: string) {
  if (!value) {
    return fallback;
  }

  return formatUiDate(value);
}

function SummaryCard({
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
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
    </div>
  );
}

function DetailItem({
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

export default function PendingOrdersPage() {
  const { isChecking } = useRequireWorkerSession();
  const { t } = useTranslation();
  const statusLabel = useStatusLabel();
  const [allOrders, setAllOrders] = useState<PendingOrder[]>([]);
  const [billSearch, setBillSearch] = useState("");
  const [openBills, setOpenBills] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);

  useAutoScrollToMessage(errorMessage, errorRef);

  useEffect(() => {
    async function loadPendingOrders() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("orders")
          .select(
            "id, bill_number, customer_name, received_date, ready_date, total_amount, amount_paid, amount_pending, status"
          )
          .gt("amount_pending", 0)
          .neq("status", "DELIVERED")
          .order("received_date", { ascending: true })
          .returns<PendingOrder[]>();

        if (error) {
          setErrorMessage(error.message || t("pendingOrders.couldNotLoad"));
          return;
        }

        setAllOrders(data ?? []);
      } catch (error) {
        console.error("Pending orders load failed", error);
        setErrorMessage(
          error instanceof Error ? error.message : t("pendingOrders.saveFailed")
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadPendingOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const search = billSearch.trim();

    if (!search) {
      return allOrders;
    }

    return allOrders.filter((order) => order.bill_number.includes(search));
  }, [allOrders, billSearch]);

  const totalPendingAmount = useMemo(
    () => allOrders.reduce((sum, order) => sum + Number(order.amount_pending || 0), 0),
    [allOrders]
  );

  function toggleBillDetails(billNumber: string) {
    setOpenBills((current) => ({
      ...current,
      [billNumber]: !current[billNumber],
    }));
  }

  if (isChecking) {
    return null;
  }

  return (
    <main className="min-h-screen px-4 py-6">
      <section className="mx-auto w-full max-w-sm rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_rgba(31,41,55,0.12)] backdrop-blur">
        <div className="rounded-[24px] bg-[linear-gradient(135deg,#0d5eb8_0%,#1788e6_58%,#4fc3ff_100%)] px-5 py-6 text-white shadow-[0_16px_40px_rgba(20,121,220,0.24)]">
          <PageBrand showHome />
          <h1 className="mt-2 text-3xl font-bold leading-tight">{t("pendingOrders.title")}</h1>
          <p className="mt-3 text-base leading-6 text-white/85">
            {t("pendingOrders.subtitle")}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <SummaryCard label={t("pendingOrders.pendingBills")} value={String(allOrders.length)} />
          <SummaryCard label={t("common.pendingAmount")} value={formatCurrency(totalPendingAmount)} />
        </div>

        <div className="mt-5">
          <InputField
            label={t("pendingOrders.searchBillNumber")}
            icon={<Search className="h-5 w-5" />}
            placeholder={t("pendingOrders.billPlaceholder")}
            inputMode="numeric"
            value={billSearch}
            onChange={(event) => setBillSearch(event.target.value)}
          />
        </div>

        {errorMessage ? (
          <div
            ref={errorRef}
            className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-base font-semibold text-red-700"
          >
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-5 rounded-[22px] border border-sand bg-white px-4 py-6 text-center shadow-sm">
            <Clock3 className="mx-auto h-8 w-8 text-brand" />
            <p className="mt-3 text-lg font-bold text-ink">{t("pendingOrders.loading")}</p>
          </div>
        ) : null}

        {!isLoading && filteredOrders.length === 0 ? (
          <div className="mt-5 rounded-[22px] border border-sand bg-white px-4 py-6 text-center shadow-sm">
            <AlertCircle className="mx-auto h-8 w-8 text-brand" />
            <p className="mt-3 text-xl font-bold text-ink">{t("pendingOrders.noneFound")}</p>
            <p className="mt-2 text-base leading-6 text-slate-600">
              {t("pendingOrders.emptyHint")}
            </p>
          </div>
        ) : null}

        {!isLoading ? (
          <div className="mt-5 space-y-4">
            {filteredOrders.map((order) => (
              <article
                key={order.id}
                className="rounded-[24px] border border-sand bg-cream px-4 py-4 shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleBillDetails(order.bill_number)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white px-4 py-4 text-left shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {t("common.billWithNumber", { billNumber: order.bill_number })}
                    </p>
                    <p className="mt-2 text-xl font-bold text-ink">{order.customer_name}</p>
                    <p className="mt-2 text-lg font-bold text-brand">
                      {t("common.pendingValue", {
                        amount: formatCurrency(Number(order.amount_pending || 0)),
                      })}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-6 w-6 shrink-0 text-brand transition ${
                      openBills[order.bill_number] ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {openBills[order.bill_number] ? (
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    <DetailItem label={t("common.receivedDate")} value={formatDisplayDate(order.received_date, t("common.notSet"))} />
                    <DetailItem label={t("common.readyDate")} value={formatDisplayDate(order.ready_date, t("common.notSet"))} />
                    <DetailItem
                      label={t("common.totalAmount")}
                      value={formatCurrency(Number(order.total_amount || 0))}
                    />
                    <DetailItem
                      label={t("common.totalPaid")}
                      value={formatCurrency(Number(order.amount_paid || 0))}
                    />
                    <DetailItem
                      label={t("common.pendingAmount")}
                      value={formatCurrency(Number(order.amount_pending || 0))}
                    />
                    <DetailItem label={t("common.currentStatus")} value={statusLabel(order.status)} />
                  </div>
                ) : null}

                <div className="mt-4">
                  <Link href={`/delivery?bill=${order.bill_number}`}>
                    <BigButton type="button">
                      <ReceiptText className="h-6 w-6" />
                      {t("common.openBill")}
                    </BigButton>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
