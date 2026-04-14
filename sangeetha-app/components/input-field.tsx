import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: ReactNode;
};

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  function InputField({ label, icon, className = "", ...props }, ref) {
    return (
      <label className="block">
        <span className="mb-2 block text-lg font-semibold text-ink">{label}</span>
        <span className="flex items-center gap-3 rounded-2xl border border-sand bg-white px-4 py-4 shadow-sm">
          <span className="text-brand">{icon}</span>
          <input
            ref={ref}
            className={`w-full border-0 bg-transparent text-lg text-ink outline-none placeholder:text-slate-400 ${className}`}
            {...props}
          />
        </span>
      </label>
    );
  }
);
