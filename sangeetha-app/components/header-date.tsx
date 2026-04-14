"use client";

import { CalendarDays } from "lucide-react";
import { formatUiDate } from "@/lib/utils";

export function HeaderDate() {
  const today = formatUiDate(new Date());

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/22 px-3 py-1 text-xs font-bold text-white">
      <CalendarDays className="h-4 w-4" />
      <span>{today}</span>
    </div>
  );
}
