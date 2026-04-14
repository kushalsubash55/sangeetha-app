"use client";

import Link from "next/link";
import { House } from "lucide-react";

export function HeaderHomeLink() {
  return (
    <Link
      href="/"
      aria-label="Go to home"
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-[linear-gradient(135deg,#ffffff_0%,#e9f5ff_100%)] text-[#0d5eb8] shadow-[0_10px_24px_rgba(13,94,184,0.24)] transition hover:scale-[1.02] hover:text-[#084a95]"
    >
      <House className="h-5 w-5 stroke-[2.4]" />
    </Link>
  );
}
