import type { ButtonHTMLAttributes, ReactNode } from "react";

type BigButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function BigButton({ children, className = "", ...props }: BigButtonProps) {
  return (
    <button
      className={`flex w-full items-center justify-center gap-3 rounded-2xl bg-[linear-gradient(135deg,#1479dc_0%,#2ca8f5_100%)] px-5 py-4 text-xl font-bold text-white shadow-[0_14px_28px_rgba(20,121,220,0.28)] transition hover:brightness-95 focus:outline-none focus:ring-4 focus:ring-sky-200 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
