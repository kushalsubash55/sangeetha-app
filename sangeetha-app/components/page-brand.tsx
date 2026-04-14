"use client";

import Image from "next/image";
import { HeaderDate } from "@/components/header-date";
import { HeaderHomeLink } from "@/components/header-home-link";

type PageBrandProps = {
  showHome?: boolean;
};

export function PageBrand({ showHome = false }: PageBrandProps) {
  return (
    <div className="mb-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="inline-flex max-w-[220px] rounded-2xl border border-white/80 bg-white px-3 py-2 shadow-[0_12px_28px_rgba(16,111,208,0.22)]">
            <Image
              src="/brand/sangeetha-logo.png"
              alt="Sangeetha"
              width={220}
              height={62}
              className="h-auto w-full"
              priority
            />
          </div>
        </div>
        {showHome ? <HeaderHomeLink /> : null}
      </div>
      <div className="mt-2">
        <HeaderDate />
      </div>
    </div>
  );
}
