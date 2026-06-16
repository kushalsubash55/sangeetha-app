"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageBrand } from "@/components/page-brand";
import { useStatusLabel, useTranslation } from "@/lib/i18n";
import { getSupabaseClient } from "@/lib/supabase";
import { useRequireSession } from "@/lib/session";
import { formatCurrency, formatUiDate } from "@/lib/utils";

type OrderResult = {
  id: string;
  bill_number: string;
  customer_name: string;
  received_date: string;
  total_amount: number;
  amount_paid: number;
  amount_pending: number;
  status: string;
};

type PaymentRow = {
  amount: number;
};

function DetailRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-sand bg-white px-4 py-4 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className={valueClassName ?? "mt-2 text-xl font-bold text-ink"}>{value}</p>
    </div>
  );
}

export default function SummaryBillDetailsPage() {
  const { isChecking } = useRequireSession({
    allowedRoles: ["owner"],
    redirectTo: "/",
  });
  const { t } = useTranslation();
  const statusLabel = useStatusLabel();
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
            "id, bill_number, customer_name, received_date, total_amount, amount_paid, amount_pending, status"
          )
          .eq("bill_number", billNumber)
          .maybeSingle<OrderResult>();

        if (orderError) {
          setErrorMessage(orderError.message || t("billDetails.couldNotLoad"));
          return;
        }

        if (!orderData) {
          setErrorMessage(t("billDetails.billNotFound"));
          return;
        }

        const { data: payments, error: paymentsError } = await supabase
          .from("payments")
          .select("amount")
          .eq("order_id", orderData.id)
          .returns<PaymentRow[]>();

        if (paymentsError) {
          setErrorMessage(paymentsError.message || t("billDetails.couldNotLoadPayments"));
          return;
        }

        const paid = (payments ?? []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

        setOrder(orderData);
        setTotalPaid(paid);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : t("billDetails.saveFailed")
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
        <div className="rounded-[24px] bg-[linear-gradient(135deg,#0d5eb8_0%,#1788e6_58%,#4fc3ff_100%)] px-5 py-6 text-white shadow-[0_16px_40px_rgba(20,121,220,0.24)]">
          <PageBrand showHome />
          <h1 className="mt-2 text-3xl font-bold leading-tight">{t("billDetails.title")}</h1>
          <p className="mt-3 text-base leading-6 text-white/85">
            {t("billDetails.subtitle", { billNumber })}
          </p>
        </div>

        {isLoading ? (
          <div className="mt-5 rounded-[22px] bg-cream px-4 py-6 text-center text-base font-semibold text-slate-600">
            {t("billDetails.loading")}
          </div>
        ) : errorMessage ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-base font-semibold text-red-700">
            {errorMessage}
          </div>
        ) : order ? (
          <div className="mt-5 space-y-3">
            <div className="rounded-[22px] bg-cream px-4 py-4 text-center">
              <p className="text-base font-semibold text-ink">{t("billDetails.billFound")}</p>
              <p className="mt-1 text-3xl font-bold text-brand">
                {t("common.billWithNumber", { billNumber: order.bill_number })}
              </p>
            </div>

            <DetailRow label={t("common.billNumber")} value={order.bill_number} valueClassName="mt-2 text-3xl font-bold text-brand" />
            <DetailRow label={t("common.customerName")} value={order.customer_name} />
            <DetailRow label={t("common.receivedDate")} value={formatUiDate(order.received_date)} />
            <DetailRow label={t("common.totalAmount")} value={formatCurrency(order.total_amount)} />
            <DetailRow label={t("common.advancePaid")} value={formatCurrency(order.amount_paid)} />
            <DetailRow label={t("common.totalPaid")} value={formatCurrency(totalPaid)} />
            <DetailRow label={t("common.balancePending")} value={formatCurrency(order.amount_pending)} />
            <DetailRow label={t("common.status")} value={statusLabel(order.status)} />
          </div>
        ) : null}

        <div className="mt-5">
          <Link
            href="/summary/today"
            className="flex items-center justify-center gap-2 rounded-2xl border border-sand bg-white px-4 py-4 text-lg font-bold text-ink shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
            {t("common.back")}
          </Link>
        </div>
      </section>
    </main>
  );
}
