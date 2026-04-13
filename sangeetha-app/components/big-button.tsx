import type { ButtonHTMLAttributes, ReactNode } from "react";

type BigButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function BigButton({ children, className = "", ...props }: BigButtonProps) {
  return (
    <button
      className={`flex w-full items-center justify-center gap-3 rounded-2xl bg-accent px-5 py-4 text-xl font-bold text-ink shadow-md transition hover:brightness-95 focus:outline-none focus:ring-4 focus:ring-amber-200 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
