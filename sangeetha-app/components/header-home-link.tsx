"use client";

import Link from "next/link";
import { House } from "lucide-react";

export function HeaderHomeLink() {
  return (
    <Link
      href="/"
      aria-label="Go to home"
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white transition hover:bg-white/20"
    >
      <House className="h-5 w-5" />
    </Link>
  );
}
