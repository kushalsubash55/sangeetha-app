"use client";

import { CalendarDays } from "lucide-react";

export function HeaderDate() {
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white/90">
      <CalendarDays className="h-4 w-4" />
      <span>{today}</span>
    </div>
  );
}
