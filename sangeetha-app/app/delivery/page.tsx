"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ReceiptText,
  Search,
  Truck,
  Wallet,
} from "lucide-react";
import { BigButton } from "@/components/big-button";
import { InputField } from "@/components/input-field";
import { PageBrand } from "@/components/page-brand";
import { usePaymentModeLabel, useStatusLabel, useTranslation } from "@/lib/i18n";
import { useRequireWorkerSession } from "@/lib/session";
import { getSupabaseClient } from "@/lib/supabase";
import { formatCurrency, formatUiDateTime } from "@/lib/utils";

type PaymentMode = "cash" | "upi";

type OrderResult = {
  id: string;
  bill_number: string;
  customer_name: string;
  total_amount: number;
  amount_paid: number;
  amount_pending: number;
  status: string;
  notes: string | null;
};

type PaymentRow = {
  amount: number;
};

type DeliveryPaymentResult = {
  order_id: string;
  bill_number: string;
  total_paid: number;
  amount_pending: number;
  status: string;
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

function isDeliveredOrder(order: OrderResult | null) {
  if (!order) {
    return false;
  }

  return order.status.trim().toUpperCase() === "DELIVERED" || Number(order.amount_pending) === 0;
}

function DeliveryPageContent() {
  const { isChecking, session } = useRequireWorkerSession();
  const { t } = useTranslation();
  const statusLabel = useStatusLabel();
  const paymentModeLabel = usePaymentModeLabel();
  const router = useRouter();
  const searchParams = useSearchParams();
  const billFromUrl = searchParams.get("bill") ?? "";

  const [billNumber, setBillNumber] = useState(billFromUrl);
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [totalPaid, setTotalPaid] = useState(0);
  const [amountReceivedNow, setAmountReceivedNow] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [notFoundMessage, setNotFoundMessage] = useState("");
  const delivered = isDeliveredOrder(order);

  useEffect(() => {
    setBillNumber(billFromUrl);

    if (billFromUrl) {
      void loadOrder(billFromUrl);
    }
  }, [billFromUrl]);

  async function loadOrder(rawBillNumber: string) {
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    setWarningMessage("");
    setNotFoundMessage("");
    setOrder(null);
    setTotalPaid(0);

    try {
      const supabase = getSupabaseClient();

      const { data: foundOrder, error: orderError } = await supabase
        .from("orders")
        .select("id, bill_number, customer_name, total_amount, amount_paid, amount_pending, status, notes")
        .eq("bill_number", rawBillNumber.trim())
        .maybeSingle<OrderResult>();

      if (orderError) {
        setErrorMessage(orderError.message || t("delivery.couldNotLoadOrder"));
        return;
      }

      if (!foundOrder) {
        setNotFoundMessage(t("delivery.billNotFound"));
        return;
      }

      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("amount")
        .eq("order_id", foundOrder.id)
        .returns<PaymentRow[]>();

      if (paymentsError) {
        setErrorMessage(paymentsError.message || t("delivery.couldNotLoadHistory"));
        return;
      }

      const paid = (payments ?? []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

      setOrder(foundOrder);
      setTotalPaid(paid);
      setAmountReceivedNow("");
      setPaymentMode("cash");
    } catch (error) {
      console.error("Delivery page load failed", error);
      setErrorMessage(
        error instanceof Error ? error.message : t("delivery.saveFailed")
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!billNumber.trim()) {
      setErrorMessage(t("delivery.enterBillNumber"));
      return;
    }

    await loadOrder(billNumber);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setWarningMessage("");

    if (!order) {
      setErrorMessage(t("delivery.searchFirst"));
      return;
    }

    const receivedNow = Number(amountReceivedNow || 0);

    if (Number.isNaN(receivedNow) || receivedNow < 0) {
      setErrorMessage(t("delivery.enterValidAmount"));
      return;
    }

    if (receivedNow > order.amount_pending) {
      setErrorMessage(t("delivery.amountTooHigh"));
      return;
    }

    if (receivedNow === 0) {
      setErrorMessage(t("delivery.enterPaymentAmount"));
      return;
    }

    setIsSaving(true);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc("record_delivery_payment", {
        p_bill_number: order.bill_number,
        p_amount_received: receivedNow,
        p_payment_method: paymentMode,
      });

      if (error) {
        setErrorMessage(error.message || t("delivery.couldNotSavePayment"));
        return;
      }

      const paymentResult = Array.isArray(data)
        ? (data[0] as DeliveryPaymentResult | undefined)
        : (data as DeliveryPaymentResult | null);

      if (!paymentResult) {
        setErrorMessage(t("delivery.couldNotSavePayment"));
        return;
      }

      const refreshedOrder: OrderResult = {
        ...order,
        amount_paid: Number(paymentResult.total_paid),
        amount_pending: Number(paymentResult.amount_pending),
        status: paymentResult.status,
      };

      setOrder(refreshedOrder);
      setTotalPaid(Number(paymentResult.total_paid));
      setAmountReceivedNow("");

      try {
        const notificationResponse = await fetch("/api/telegram-owner-notification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            billNumber: order.bill_number,
            customerName: order.customer_name,
            amountReceivedNow: receivedNow,
            paymentMode,
            pendingAmountAfterPayment: Number(paymentResult.amount_pending),
            workerIdentity: session?.phone || t("common.unknownWorker"),
            timestamp: formatUiDateTime(new Date()),
          }),
        });

        if (!notificationResponse.ok) {
          setWarningMessage(t("delivery.notificationFailed"));
        }
      } catch (error) {
        console.error("Telegram notification failed", error);
        setWarningMessage(t("delivery.notificationFailed"));
      }

      if (Number(paymentResult.amount_pending) === 0) {
        setSuccessMessage(t("delivery.deliveredRedirect"));
        window.setTimeout(() => {
          router.push("/");
        }, 1200);
        return;
      }

      setSuccessMessage(
        t("delivery.paymentSaved", {
          totalPaid: formatCurrency(Number(paymentResult.total_paid)),
          pending: formatCurrency(Number(paymentResult.amount_pending)),
        })
      );
    } catch (error) {
      console.error("Delivery save failed", error);
      setErrorMessage(
        error instanceof Error ? error.message : t("delivery.saveFailed")
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isChecking) {
    return null;
  }

  return (
    <main className="min-h-screen px-4 py-6">
      <section className="mx-auto w-full max-w-sm rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_rgba(31,41,55,0.12)] backdrop-blur">
        <div className="rounded-[24px] bg-[linear-gradient(135deg,#0d5eb8_0%,#1788e6_58%,#4fc3ff_100%)] px-5 py-6 text-white shadow-[0_16px_40px_rgba(20,121,220,0.24)]">
          <PageBrand showHome />
          <h1 className="mt-2 text-3xl font-bold leading-tight">{t("delivery.title")}</h1>
          <p className="mt-3 text-base leading-6 text-white/85">
            {t("delivery.subtitle")}
          </p>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSearch}>
          <InputField
            label={t("common.billNumber")}
            name="billNumber"
            placeholder={t("delivery.billPlaceholder")}
            value={billNumber}
            onChange={(event) => setBillNumber(event.target.value)}
            icon={<ReceiptText className="h-6 w-6" />}
          />
          <BigButton type="submit" disabled={isLoading} className={isLoading ? "opacity-70" : ""}>
            <Search className="h-6 w-6" />
            {isLoading ? t("common.searching") : t("common.openBill")}
          </BigButton>
        </form>

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-base font-semibold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {notFoundMessage ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-base font-semibold text-amber-800">
            {notFoundMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-base font-semibold text-emerald-700">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
              <span>{successMessage}</span>
            </div>
          </div>
        ) : null}

        {warningMessage ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-base font-semibold text-amber-800">
            {warningMessage}
          </div>
        ) : null}

        {order ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-[22px] bg-cream px-4 py-4 text-center">
              <p className="text-base font-semibold text-ink">
                {t("common.billWithNumber", { billNumber: order.bill_number })}
              </p>
              <p className="mt-1 text-2xl font-bold text-brand">{order.customer_name}</p>
              <p className="mt-2 text-sm font-semibold text-slate-600">
                {t("delivery.fullPaymentHint")}
              </p>
            </div>

            <DetailRow label={t("common.billNumber")} value={order.bill_number} />
            <DetailRow label={t("common.customerName")} value={order.customer_name} />
            <DetailRow label={t("common.totalAmount")} value={formatCurrency(order.total_amount)} />
            <DetailRow label={t("common.advancePaid")} value={formatCurrency(order.amount_paid)} />
            <DetailRow label={t("common.totalPaidSoFar")} value={formatCurrency(totalPaid)} />
            <DetailRow label={t("common.balancePending")} value={formatCurrency(order.amount_pending)} />
            <DetailRow label={t("common.currentStatus")} value={statusLabel(order.status)} />
            <DetailRow label={t("common.notes")} value={order.notes || t("common.noNotes")} />

            {delivered ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center text-base font-semibold text-emerald-700">
                {t("delivery.alreadyDelivered")}
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSave}>
                <InputField
                  label={t("delivery.amountReceivedNow")}
                  name="amountReceivedNow"
                  placeholder={t("delivery.amountPlaceholder")}
                  type="number"
                  min="0"
                  step="1"
                  inputMode="decimal"
                  value={amountReceivedNow}
                  onChange={(event) => setAmountReceivedNow(event.target.value)}
                  icon={<Wallet className="h-6 w-6" />}
                />

                <div>
                  <p className="mb-2 text-lg font-semibold text-ink">{t("common.paymentMode")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: paymentModeLabel("cash"), value: "cash" },
                      { label: paymentModeLabel("upi"), value: "upi" },
                    ].map((option) => {
                      const active = paymentMode === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setPaymentMode(option.value as PaymentMode)}
                          className={`rounded-2xl border px-3 py-4 text-lg font-bold transition ${
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
                </div>

                <BigButton type="submit" disabled={isSaving} className={isSaving ? "opacity-70" : ""}>
                  <Truck className="h-6 w-6" />
                  {isSaving ? t("common.saving") : t("common.savePayment")}
                </BigButton>
              </form>
            )}
          </div>
        ) : null}

        <div className="mt-5">
          <Link
            href="/"
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

export default function DeliveryPage() {
  return (
    <Suspense>
      <DeliveryPageContent />
    </Suspense>
  );
}
