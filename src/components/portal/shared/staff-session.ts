"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ClientError, errorMessage } from "@/lib/api-client";
import type { Staff } from "@/lib/portal";

export function useStaffSession(expected: "staff" | "admin") {
  const router = useRouter();
  const [user, setUser] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    api<Staff>("/auth/me", { signal: controller.signal })
      .then((value) => {
        if (value.role !== expected) {
          router.replace(value.role === "admin" ? "/admin" : "/petugas");
          return;
        }
        setUser(value);
      })
      .catch((cause) => {
        if (
          !controller.signal.aborted &&
          cause instanceof ClientError &&
          cause.status === 401
        ) {
          router.replace("/login");
          return;
        }
        if (!controller.signal.aborted) setError(errorMessage(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [expected, router]);

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST", body: {} });
    } finally {
      router.replace("/login");
    }
  }

  return { user, loading, error, logout };
}
