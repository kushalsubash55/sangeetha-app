"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const WORKER_SESSION_KEY = "sangeetha_worker_session";

export type WorkerSession = {
  phone: string;
  role: "worker";
};

export function setWorkerSession(session: WorkerSession) {
  window.localStorage.setItem(WORKER_SESSION_KEY, JSON.stringify(session));
}

export function getWorkerSession(): WorkerSession | null {
  const rawSession = window.localStorage.getItem(WORKER_SESSION_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as WorkerSession;
  } catch {
    return null;
  }
}

export function clearWorkerSession() {
  window.localStorage.removeItem(WORKER_SESSION_KEY);
}

export function useRequireWorkerSession() {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [session, setSession] = useState<WorkerSession | null>(null);

  useEffect(() => {
    const existingSession = getWorkerSession();

    if (!existingSession) {
      router.replace("/login");
      return;
    }

    setSession(existingSession);
    setIsChecking(false);
  }, [pathname, router]);

  return { isChecking, session };
}
