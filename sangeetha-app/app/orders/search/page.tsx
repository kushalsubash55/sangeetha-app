"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ReceiptText,
  Search,
} from "lucide-react";
import { BigButton } from "@/components/big-button";
import { InputField } from "@/components/input-field";
import { PageBrand } from "@/components/page-brand";
import { focusFieldAfterError, useAutoScrollToMessage } from "@/lib/form-feedback";
import { useStatusLabel, useTranslation } from "@/lib/i18n";
import { getSupabaseClient } from "@/lib/supabase";
import { useRequireSession } from "@/lib/session";
import { formatCurrency, formatUiDate } from "@/lib/utils";

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
  const { isChecking } = useRequireSession();
  const { t } = useTranslation();
  const statusLabel = useStatusLabel();
  const searchParams = useSearchParams();
  const billFromUrl = searchParams.get("bill") ?? "";
  const [billNumber, setBillNumber] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notFoundMessage, setNotFoundMessage] = useState("");
  const [result, setResult] = useState<OrderResult | null>(null);
  const [totalPaid, setTotalPaid] = useState(0);
  const billNumberRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const activeMessage = errorMessage || notFoundMessage;

  useAutoScrollToMessage(activeMessage, messageRef);

  async function runSearch(rawBillNumber: string) {
    setErrorMessage("");
    setNotFoundMessage("");
    setResult(null);
    setTotalPaid(0);

    if (!rawBillNumber.trim()) {
      setErrorMessage(t("searchBill.enterBillNumber"));
      focusFieldAfterError(billNumberRef);
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
        setErrorMessage(orderError.message || t("searchBill.couldNotSearchOrder"));
        return;
      }

      if (!order) {
        setNotFoundMessage(t("searchBill.billNotFound"));
        return;
      }

      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("amount")
        .eq("order_id", order.id)
        .returns<PaymentRow[]>();

      if (paymentsError) {
        setErrorMessage(paymentsError.message || t("searchBill.couldNotLoadPayments"));
        return;
      }

      const paid = (payments ?? []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

      setResult(order);
      setTotalPaid(paid);
    } catch (error) {
      console.error("Order search failed", error);
      setErrorMessage(
        error instanceof Error ? error.message : t("searchBill.saveFailed")
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
        <div className="rounded-[24px] bg-[linear-gradient(135deg,#0d5eb8_0%,#1788e6_58%,#4fc3ff_100%)] px-5 py-6 text-white shadow-[0_16px_40px_rgba(20,121,220,0.24)]">
          <PageBrand showHome />
          <h1 className="mt-2 text-3xl font-bold leading-tight">{t("searchBill.title")}</h1>
          <p className="mt-3 text-base leading-6 text-white/85">
            {t("searchBill.subtitle")}
          </p>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSearch}>
          <InputField
            ref={billNumberRef}
            label={t("common.billNumber")}
            name="billNumber"
            placeholder={t("searchBill.billPlaceholder")}
            value={billNumber}
            onChange={(event) => setBillNumber(event.target.value)}
            icon={<ReceiptText className="h-6 w-6" />}
          />

          {errorMessage ? (
            <div
              ref={messageRef}
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-base font-semibold text-red-700"
            >
              {errorMessage}
            </div>
          ) : null}

          {notFoundMessage ? (
            <div
              ref={messageRef}
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-base font-semibold text-amber-800"
            >
              {notFoundMessage}
            </div>
          ) : null}

          <BigButton type="submit" disabled={isSearching} className={isSearching ? "opacity-70" : ""}>
            <Search className="h-6 w-6" />
            {isSearching ? t("common.searching") : t("common.search")}
          </BigButton>
        </form>

        {result ? (
          <div className="mt-5 space-y-3">
            <div className="rounded-[22px] bg-cream px-4 py-4 text-center">
              <p className="text-base font-semibold text-ink">{t("searchBill.orderFound")}</p>
              <p className="mt-1 text-2xl font-bold text-brand">
                {t("common.billWithNumber", { billNumber: result.bill_number })}
              </p>
            </div>

            <DetailRow label={t("common.billNumber")} value={result.bill_number} />
            <DetailRow label={t("common.customerName")} value={result.customer_name} />
            <DetailRow label={t("common.receivedDate")} value={formatUiDate(result.received_date)} />
            <DetailRow label={t("common.readyDate")} value={result.ready_date ? formatUiDate(result.ready_date) : t("common.notSet")} />
            <DetailRow label={t("common.totalAmount")} value={formatCurrency(result.total_amount)} />
            <DetailRow label={t("common.advancePaid")} value={formatCurrency(result.amount_paid)} />
            <DetailRow label={t("common.totalPaid")} value={formatCurrency(totalPaid)} />
            <DetailRow label={t("common.balancePending")} value={formatCurrency(result.amount_pending)} />
            <DetailRow label={t("common.status")} value={statusLabel(result.status)} />
            <DetailRow label={t("common.notes")} value={result.notes || t("common.noNotes")} />
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-2xl border border-sand bg-white px-4 py-4 text-lg font-bold text-ink shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
            {t("common.back")}
          </Link>
          {result ? (
            <Link
              href={`/delivery?bill=${encodeURIComponent(result.bill_number)}`}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#1479dc_0%,#2ca8f5_100%)] px-4 py-4 text-lg font-bold text-white shadow-[0_14px_28px_rgba(20,121,220,0.24)]"
            >
              <ArrowRight className="h-5 w-5" />
              {t("common.delivery")}
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#1479dc_0%,#2ca8f5_100%)] px-4 py-4 text-lg font-bold text-white opacity-70 shadow-[0_14px_28px_rgba(20,121,220,0.24)]"
            >
              <ArrowRight className="h-5 w-5" />
              {t("common.delivery")}
            </button>
          )}
        </div>

        <div className="mt-3 rounded-2xl bg-cream px-4 py-4 text-center text-sm font-semibold text-slate-600">
          {t("searchBill.deliveryHint")}
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
