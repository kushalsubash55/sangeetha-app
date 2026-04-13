import { LogIn, Phone, ShieldCheck } from "lucide-react";
import { BigButton } from "@/components/big-button";
import { InputField } from "@/components/input-field";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-6">
      <section className="w-full max-w-sm rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_rgba(31,41,55,0.12)] backdrop-blur">
        <div className="mb-6 rounded-[24px] bg-brand px-5 py-6 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
            Tailor Shop
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight">
            Worker Login
          </h1>
          <p className="mt-3 text-base leading-6 text-white/85">
            Enter phone number and PIN. Keep it simple and fast at the counter.
          </p>
        </div>

        <form className="space-y-4">
          <InputField
            label="Phone Number"
            name="phone"
            placeholder="Enter phone number"
            type="tel"
            icon={<Phone className="h-6 w-6" />}
          />
          <InputField
            label="4 Digit PIN"
            name="pin"
            placeholder="Enter PIN"
            type="password"
            icon={<ShieldCheck className="h-6 w-6" />}
          />
          <BigButton type="submit">
            <LogIn className="h-6 w-6" />
            Login
          </BigButton>
        </form>

        <div className="mt-5 rounded-[22px] bg-cream px-4 py-4 text-center">
          <p className="text-base font-semibold text-ink">Version 1</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Orders, delivery, payments, and owner reports will be added screen by
            screen.
          </p>
        </div>
      </section>
    </main>
  );
}
