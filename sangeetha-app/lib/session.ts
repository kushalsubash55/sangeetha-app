"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const APP_SESSION_KEY = "sangeetha_user_session";

export type AppRole = "owner" | "employee";

export type AppSession = {
  id: string;
  fullName: string;
  phone: string;
  role: AppRole;
};

export function setAppSession(session: AppSession) {
  window.localStorage.setItem(APP_SESSION_KEY, JSON.stringify(session));
}

export function getAppSession(): AppSession | null {
  const rawSession = window.localStorage.getItem(APP_SESSION_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawSession) as Partial<AppSession>;

    if (
      typeof parsed.id !== "string" ||
      typeof parsed.fullName !== "string" ||
      typeof parsed.phone !== "string" ||
      (parsed.role !== "owner" && parsed.role !== "employee")
    ) {
      return null;
    }

    return parsed as AppSession;
  } catch {
    return null;
  }
}

export function clearAppSession() {
  window.localStorage.removeItem(APP_SESSION_KEY);
}

type SessionOptions = {
  allowedRoles?: AppRole[];
  redirectTo?: string;
};

export function useRequireSession(options: SessionOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [session, setSession] = useState<AppSession | null>(null);
  const allowedRolesKey = options.allowedRoles?.join("|") ?? "";
  const redirectTo = options.redirectTo ?? "/";

  useEffect(() => {
    const existingSession = getAppSession();

    if (!existingSession) {
      router.replace("/login");
      return;
    }

    if (
      options.allowedRoles &&
      !options.allowedRoles.includes(existingSession.role)
    ) {
      router.replace(redirectTo);
      return;
    }

    setSession(existingSession);
    setIsChecking(false);
  }, [allowedRolesKey, pathname, redirectTo, router]);

  return { isChecking, session };
}

export function getWorkerSession() {
  return getAppSession();
}

export function setWorkerSession(session: AppSession) {
  setAppSession(session);
}

export function clearWorkerSession() {
  clearAppSession();
}

export function useRequireWorkerSession() {
  return useRequireSession();
}
