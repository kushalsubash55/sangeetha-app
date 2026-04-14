"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeIndianRupee,
  CheckCircle2,
  Home,
  FileText,
  ReceiptText,
  Save,
  Wallet,
} from "lucide-react";
import { BigButton } from "@/components/big-button";
import { InputField } from "@/components/input-field";
import { PageBrand } from "@/components/page-brand";
import { focusFieldAfterError, useAutoScrollToMessage } from "@/lib/form-feedback";
import { usePaymentModeLabel, useTranslation } from "@/lib/i18n";
import { getSupabaseClient } from "@/lib/supabase";
import { formatCurrency, todayDate } from "@/lib/utils";
import { useRequireSession } from "@/lib/session";

type PaymentMode = "cash" | "upi" | "none";

type SavedOrderResult = {
  id: string;
  bill_number: string;
  amount_pending: number;
};

type SuccessDialogState = {
  billNumber: string;
  pendingAmount: string;
} | null;

type FormState = {
  customerName: string;
  receivedDate: string;
  totalAmount: string;
  advancePaid: string;
  paymentMode: PaymentMode;
};

const initialForm: FormState = {
  customerName: "",
  receivedDate: todayDate(),
  totalAmount: "",
  advancePaid: "",
  paymentMode: "none",
};

export default function NewOrderPage() {
  const { isChecking } = useRequireSession();
  const { t } = useTranslation();
  const paymentModeLabel = usePaymentModeLabel();
  const [form, setForm] = useState<FormState>(initialForm);
  const [nextBillNumber, setNextBillNumber] = useState("");
  const [isLoadingBillNumber, setIsLoadingBillNumber] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successDialog, setSuccessDialog] = useState<SuccessDialogState>(null);
  const [isSaving, setIsSaving] = useState(false);
  const customerNameRef = useRef<HTMLInputElement>(null);
  const receivedDateRef = useRef<HTMLInputElement>(null);
  const totalAmountRef = useRef<HTMLInputElement>(null);
  const advancePaidRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useAutoScrollToMessage(errorMessage, errorRef);

  useEffect(() => {
    let isMounted = true;

    async function loadNextBillNumber() {
      try {
        setIsLoadingBillNumber(true);
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.rpc("get_next_bill_number");

        if (error) {
          throw error;
        }

        if (isMounted) {
          setNextBillNumber(String(data ?? ""));
        }
      } catch (error) {
        console.error("Could not load next bill number", error);
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : t("newOrder.couldNotLoadBillNumber")
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingBillNumber(false);
        }
      }
    }

    void loadNextBillNumber();

    return () => {
      isMounted = false;
    };
  }, [t]);

  const pendingPreview = useMemo(() => {
    const total = Number(form.totalAmount || 0);
    const advance = Number(form.advancePaid || 0);
    const pending = total - advance;

    if (Number.isNaN(pending) || pending < 0) {
      return formatCurrency(0);
    }

    return formatCurrency(pending);
  }, [form.advancePaid, form.totalAmount]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function showError(
    message: string,
    fieldRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>
  ) {
    setErrorMessage(message);
    focusFieldAfterError(fieldRef);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessDialog(null);

    const totalAmount = Number(form.totalAmount);
    const advancePaid = Number(form.advancePaid || 0);

    if (!nextBillNumber) {
      showError(t("newOrder.couldNotLoadBillNumber"));
      return;
    }

    if (!form.customerName.trim()) {
      showError(t("newOrder.enterCustomerName"), customerNameRef);
      return;
    }

    if (!form.receivedDate) {
      showError(t("newOrder.enterReceivedDate"), receivedDateRef);
      return;
    }

    if (!form.totalAmount || Number.isNaN(totalAmount) || totalAmount <= 0) {
      showError(t("newOrder.enterTotalAmount"), totalAmountRef);
      return;
    }

    if (Number.isNaN(advancePaid) || advancePaid < 0) {
      showError(t("newOrder.enterValidAdvance"), advancePaidRef);
      return;
    }

    if (advancePaid > totalAmount) {
      showError(t("newOrder.advanceTooHigh"), advancePaidRef);
      return;
    }

    if (advancePaid > 0 && form.paymentMode === "none") {
      showError(t("newOrder.chooseCashOrUpi"));
      return;
    }

    if (advancePaid === 0 && form.paymentMode !== "none") {
      showError(t("newOrder.chooseNone"));
      return;
    }

    setIsSaving(true);

    try {
      const supabase = getSupabaseClient();
      const { data, error: orderError } = await supabase
        .rpc("create_order_with_next_bill_number", {
          p_customer_name: form.customerName.trim(),
          p_received_date: form.receivedDate,
          p_ready_date: null,
          p_total_amount: totalAmount,
          p_amount_paid: advancePaid,
          p_notes: null,
        })
        .single();

      if (orderError) {
        if (orderError.code === "23505") {
          setErrorMessage(t("newOrder.duplicateBill"));
          return;
        }

        setErrorMessage(orderError.message || t("newOrder.couldNotSaveOrder"));
        return;
      }

      const savedOrder = data as SavedOrderResult | null;

      if (!savedOrder) {
        setErrorMessage(t("newOrder.couldNotSaveOrder"));
        return;
      }

      if (advancePaid > 0) {
        const { error: paymentError } = await supabase.from("payments").insert({
          order_id: savedOrder.id,
          amount: advancePaid,
          payment_method: form.paymentMode,
          payment_type: advancePaid === totalAmount ? "full" : "advance",
          note: "Advance payment saved with new order",
        });

        if (paymentError) {
          setErrorMessage(paymentError.message || t("newOrder.orderSavedPaymentMissing"));
          return;
        }
      }

      await supabase.from("audit_logs").insert({
        action: "ORDER_CREATED",
        table_name: "orders",
        record_id: savedOrder.id,
        details: {
          bill_number: savedOrder.bill_number,
          advance_paid: advancePaid,
          payment_mode: form.paymentMode,
          status: "RECEIVED",
        },
      });

      setSuccessDialog({
        billNumber: savedOrder.bill_number,
        pendingAmount: formatCurrency(savedOrder.amount_pending),
      });
      setForm({
        ...initialForm,
        receivedDate: todayDate(),
      });
      setNextBillNumber(String(Number(savedOrder.bill_number) + 1));
    } catch (error) {
      console.error("New order save failed", error);
      setErrorMessage(
        error instanceof Error ? error.message : t("newOrder.saveFailed")
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
          <h1 className="mt-2 text-3xl font-bold leading-tight">{t("newOrder.title")}</h1>
          <p className="mt-3 text-base leading-6 text-white/85">
            {t("newOrder.subtitle")}
          </p>
        </div>

        <div className="mt-5 rounded-[22px] bg-cream px-4 py-4 text-center">
          <p className="text-base font-semibold text-ink">{t("common.pendingAmount")}</p>
          <p className="mt-1 text-3xl font-bold text-brand">{pendingPreview}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {t("newOrder.statusHint")}
          </p>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <span className="mb-2 block text-lg font-semibold text-ink">
              {t("common.billNumber")}
            </span>
            <div className="flex items-center gap-3 rounded-2xl border border-sand bg-white px-4 py-4 shadow-sm">
              <span className="text-brand">
                <ReceiptText className="h-6 w-6" />
              </span>
              <div>
                <p className="text-base font-semibold text-slate-500">
                  {t("newOrder.generatedBillLabel")}
                </p>
                <p className="text-2xl font-bold text-ink">
                  {isLoadingBillNumber
                    ? t("newOrder.loadingBillNumber")
                    : nextBillNumber || "--"}
                </p>
              </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {t("newOrder.generatedBillHint")}
            </p>
          </div>

          <InputField
            ref={customerNameRef}
            label={t("common.customerName")}
            name="customerName"
            placeholder={t("newOrder.customerPlaceholder")}
            value={form.customerName}
            onChange={(event) => updateField("customerName", event.target.value)}
            icon={<FileText className="h-6 w-6" />}
          />

          <InputField
            ref={receivedDateRef}
            label={t("common.receivedDate")}
            name="receivedDate"
            type="date"
            value={form.receivedDate}
            onChange={(event) => updateField("receivedDate", event.target.value)}
            icon={<ReceiptText className="h-6 w-6" />}
          />

          <InputField
            ref={totalAmountRef}
            label={t("common.totalAmount")}
            name="totalAmount"
            placeholder={t("newOrder.totalAmountPlaceholder")}
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            value={form.totalAmount}
            onChange={(event) => updateField("totalAmount", event.target.value)}
            icon={<BadgeIndianRupee className="h-6 w-6" />}
          />

          <InputField
            ref={advancePaidRef}
            label={t("common.advancePaid")}
            name="advancePaid"
            placeholder={t("newOrder.advancePlaceholder")}
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            value={form.advancePaid}
            onChange={(event) => updateField("advancePaid", event.target.value)}
            icon={<Wallet className="h-6 w-6" />}
          />

          <div>
            <p className="mb-2 text-lg font-semibold text-ink">{t("common.paymentMode")}</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: paymentModeLabel("cash"), value: "cash" },
                { label: paymentModeLabel("upi"), value: "upi" },
                { label: paymentModeLabel("none"), value: "none" },
              ].map((option) => {
                const active = form.paymentMode === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField("paymentMode", option.value as PaymentMode)}
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

          {errorMessage ? (
            <div
              ref={errorRef}
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-base font-semibold text-red-700"
            >
              {errorMessage}
            </div>
          ) : null}

          <BigButton type="submit" disabled={isSaving} className={isSaving ? "opacity-70" : ""}>
            <Save className="h-6 w-6" />
            {isSaving ? t("common.saving") : t("common.saveOrder")}
          </BigButton>
        </form>

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

      {successDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-sm rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_24px_80px_rgba(31,41,55,0.22)]">
            <div className="rounded-[24px] bg-[linear-gradient(135deg,#0d5eb8_0%,#1788e6_58%,#4fc3ff_100%)] px-5 py-5 text-center text-white shadow-[0_16px_40px_rgba(20,121,220,0.24)]">
              <CheckCircle2 className="mx-auto h-10 w-10" />
              <h2 className="mt-3 text-3xl font-bold">{t("newOrder.successTitle")}</h2>
              <p className="mt-2 text-base text-white/90">
                {t("newOrder.successSubtitle")}
              </p>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-sand bg-cream px-4 py-4 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {t("common.billNumber")}
                </p>
                <p className="mt-2 text-3xl font-bold text-brand">
                  {successDialog.billNumber}
                </p>
              </div>

              <div className="rounded-2xl border border-sand bg-white px-4 py-4 text-center shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {t("common.pendingAmount")}
                </p>
                <p className="mt-2 text-3xl font-bold text-ink">
                  {successDialog.pendingAmount}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSuccessDialog(null)}
                className="flex items-center justify-center gap-2 rounded-2xl border border-sand bg-white px-4 py-4 text-lg font-bold text-ink shadow-sm"
              >
                {t("common.ok")}
              </button>
              <Link
                href="/"
                className="flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#1479dc_0%,#2ca8f5_100%)] px-4 py-4 text-lg font-bold text-white shadow-[0_14px_28px_rgba(20,121,220,0.24)]"
              >
                <Home className="h-5 w-5" />
                {t("common.home")}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
