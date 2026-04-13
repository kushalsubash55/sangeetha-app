"use client";

import Link from "next/link";
import { House } from "lucide-react";

export function HeaderHomeLink() {
  return (
    <Link
      href="/"
      aria-label="Go to home"
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/92 text-brand shadow-sm transition hover:bg-white"
    >
      <House className="h-5 w-5" />
    </Link>
  );
}
