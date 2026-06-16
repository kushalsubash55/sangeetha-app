"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

type AppUpdateWatcherProps = {
  currentVersion: string;
};

const REFRESH_MARKER_KEY = "sangeetha_app_refresh_marker";
const REFRESH_COOLDOWN_MS = 15000;

async function clearAppCaches() {
  if (typeof window === "undefined") {
    return;
  }

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ("caches" in window) {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
  }
}

function shouldSkipReload(latestVersion: string) {
  const rawMarker = window.sessionStorage.getItem(REFRESH_MARKER_KEY);

  if (!rawMarker) {
    return false;
  }

  try {
    const marker = JSON.parse(rawMarker) as { version?: string; time?: number };
    return (
      marker.version === latestVersion &&
      typeof marker.time === "number" &&
      Date.now() - marker.time < REFRESH_COOLDOWN_MS
    );
  } catch {
    return false;
  }
}

function markReload(latestVersion: string) {
  window.sessionStorage.setItem(
    REFRESH_MARKER_KEY,
    JSON.stringify({ version: latestVersion, time: Date.now() })
  );
}

function clearReloadMarker() {
  window.sessionStorage.removeItem(REFRESH_MARKER_KEY);
}

export function AppUpdateWatcher({ currentVersion }: AppUpdateWatcherProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    async function checkForUpdate() {
      try {
        const response = await fetch("/api/app-version", {
          cache: "no-store",
          headers: {
            "cache-control": "no-cache",
          },
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { version?: string };
        const latestVersion = data.version?.trim();

        if (!latestVersion) {
          return;
        }

        if (latestVersion === currentVersion) {
          clearReloadMarker();
          return;
        }

        if (shouldSkipReload(latestVersion)) {
          return;
        }

        markReload(latestVersion);
        setIsRefreshing(true);
        await clearAppCaches();

        refreshTimeoutRef.current = window.setTimeout(() => {
          window.location.reload();
        }, 900);
      } catch (error) {
        console.error("App version check failed", error);
      }
    }

    void checkForUpdate();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void checkForUpdate();
      }
    };

    const handleFocus = () => {
      void checkForUpdate();
    };

    const intervalId = window.setInterval(() => {
      void checkForUpdate();
    }, 60000);

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(intervalId);

      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [currentVersion, pathname]);

  if (!isRefreshing) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 top-4 z-[100] mx-auto w-full max-w-sm rounded-2xl border border-brand/20 bg-white px-4 py-3 text-center text-base font-semibold text-brand shadow-[0_10px_30px_rgba(20,121,220,0.20)]">
      {t("common.appUpdatedRefreshing")}
    </div>
  );
}
