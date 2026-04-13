"use client";

import Link from "next/link";
import { House } from "lucide-react";

export function HeaderHomeLink() {
  return (
    <Link
      href="/"
      aria-label="Go to home"
      className="absolute left-4 top-4 rounded-xl bg-white/15 p-2 text-white transition hover:bg-white/20"
    >
      <House className="h-5 w-5" />
    </Link>
  );
}
