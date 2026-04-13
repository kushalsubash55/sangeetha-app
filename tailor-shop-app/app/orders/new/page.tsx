"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  BadgeIndianRupee,
  CalendarDays,
  CheckCircle2,
  FileText,
  NotebookPen,
  ReceiptText,
  Save,
  Wallet,
} from "lucide-react";
import { BigButton } from "@/components/big-button";
import { InputField } from "@/components/input-field";
import { getSupabaseClient } from "@/lib/supabase";
import { formatCurrency, todayDate } from "@/lib/utils";

type PaymentMode = "cash" | "upi" | "none";

type FormState = {
  billNumber: string;
  customerName: string;
  receivedDate: string;
  readyDate: string;
  totalAmount: string;
  advancePaid: string;
  paymentMode: PaymentMode;
  notes: string;
};

const initialForm: FormState = {
  billNumber: "",
  customerName: "",
  receivedDate: todayDate(),
  readyDate: "",
  totalAmount: "",
  advancePaid: "",
  paymentMode: "none",
  notes: "",
};

export default function NewOrderPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const totalAmount = Number(form.totalAmount);
    const advancePaid = Number(form.advancePaid || 0);

    if (!form.billNumber.trim()) {
      setErrorMessage("Enter bill number.");
      return;
    }

    if (!form.customerName.trim()) {
      setErrorMessage("Enter customer name.");
      return;
    }

    if (!form.receivedDate) {
      setErrorMessage("Enter date received.");
      return;
    }

    if (!form.totalAmount || Number.isNaN(totalAmount) || totalAmount <= 0) {
      setErrorMessage("Enter total amount.");
      return;
    }

    if (Number.isNaN(advancePaid) || advancePaid < 0) {
      setErrorMessage("Enter valid advance paid.");
      return;
    }

    if (advancePaid > totalAmount) {
      setErrorMessage("Advance cannot be more than total amount.");
      return;
    }

    if (advancePaid > 0 && form.paymentMode === "none") {
      setErrorMessage("Choose Cash or UPI for advance payment.");
      return;
    }

    if (advancePaid === 0 && form.paymentMode !== "none") {
      setErrorMessage("Choose None if no advance is paid.");
      return;
    }

    setIsSaving(true);

    try {
      const supabase = getSupabaseClient();
      const orderPayload = {
        bill_number: form.billNumber.trim(),
        customer_name: form.customerName.trim(),
        received_date: form.receivedDate,
        ready_date: form.readyDate || null,
        total_amount: totalAmount,
        amount_paid: advancePaid,
        amount_pending: totalAmount - advancePaid,
        status: "RECEIVED",
        notes: form.notes.trim() || null,
      };

      const { data: savedOrder, error: orderError } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select("id, bill_number, amount_pending")
        .single();

      if (orderError) {
        if (orderError.code === "23505") {
          setErrorMessage("This bill number already exists.");
          return;
        }

        setErrorMessage(orderError.message || "Could not save order.");
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
          setErrorMessage(paymentError.message || "Order saved, but payment was not saved.");
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

      setSuccessMessage(
        `Order saved. Bill ${savedOrder.bill_number}. Pending ${formatCurrency(savedOrder.amount_pending)}.`
      );
      setForm({
        ...initialForm,
        receivedDate: todayDate(),
      });
    } catch (error) {
      console.error("New order save failed", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong. Try again."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6">
      <section className="mx-auto w-full max-w-sm rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_rgba(31,41,55,0.12)] backdrop-blur">
        <div className="rounded-[24px] bg-brand px-5 py-6 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
            Tailor Shop
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight">New Order</h1>
          <p className="mt-3 text-base leading-6 text-white/85">
            Fill the bill details and save immediately.
          </p>
        </div>

        <div className="mt-5 rounded-[22px] bg-cream px-4 py-4 text-center">
          <p className="text-base font-semibold text-ink">Pending Amount</p>
          <p className="mt-1 text-3xl font-bold text-brand">{pendingPreview}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Status will be saved as RECEIVED.
          </p>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <InputField
            label="Bill Number"
            name="billNumber"
            placeholder="Enter bill number"
            value={form.billNumber}
            onChange={(event) => updateField("billNumber", event.target.value)}
            icon={<ReceiptText className="h-6 w-6" />}
          />

          <InputField
            label="Customer Name"
            name="customerName"
            placeholder="Enter customer name"
            value={form.customerName}
            onChange={(event) => updateField("customerName", event.target.value)}
            icon={<FileText className="h-6 w-6" />}
          />

          <InputField
            label="Date Received"
            name="receivedDate"
            type="date"
            value={form.receivedDate}
            onChange={(event) => updateField("receivedDate", event.target.value)}
            icon={<CalendarDays className="h-6 w-6" />}
          />

          <InputField
            label="Ready Date"
            name="readyDate"
            type="date"
            value={form.readyDate}
            onChange={(event) => updateField("readyDate", event.target.value)}
            icon={<CalendarDays className="h-6 w-6" />}
          />

          <InputField
            label="Total Amount"
            name="totalAmount"
            placeholder="Enter total amount"
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            value={form.totalAmount}
            onChange={(event) => updateField("totalAmount", event.target.value)}
            icon={<BadgeIndianRupee className="h-6 w-6" />}
          />

          <InputField
            label="Advance Paid"
            name="advancePaid"
            placeholder="Enter advance paid"
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            value={form.advancePaid}
            onChange={(event) => updateField("advancePaid", event.target.value)}
            icon={<Wallet className="h-6 w-6" />}
          />

          <div>
            <p className="mb-2 text-lg font-semibold text-ink">Payment Mode</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Cash", value: "cash" },
                { label: "UPI", value: "upi" },
                { label: "None", value: "none" },
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

          <label className="block">
            <span className="mb-2 block text-lg font-semibold text-ink">
              Notes (Optional)
            </span>
            <div className="rounded-2xl border border-sand bg-white px-4 py-4 shadow-sm">
              <div className="mb-3 flex items-center gap-3 text-brand">
                <NotebookPen className="h-6 w-6" />
                <span className="text-base font-semibold text-slate-500">
                  Tailoring notes
                </span>
              </div>
              <textarea
                name="notes"
                rows={4}
                placeholder="Write short note"
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                className="w-full resize-none border-0 bg-transparent text-lg text-ink outline-none placeholder:text-slate-400"
              />
            </div>
          </label>

          {errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-base font-semibold text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-base font-semibold text-emerald-700">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
                <span>{successMessage}</span>
              </div>
            </div>
          ) : null}

          <BigButton type="submit" disabled={isSaving} className={isSaving ? "opacity-70" : ""}>
            <Save className="h-6 w-6" />
            {isSaving ? "Saving..." : "Save Order"}
          </BigButton>
        </form>
      </section>
    </main>
  );
}
