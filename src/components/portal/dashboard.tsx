"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  History,
  Home,
  LogOut,
  Settings,
  UserRound,
  UsersRound,
} from "lucide-react";
import { api, ClientError, errorMessage } from "@/lib/api-client";
import type { Staff } from "@/lib/portal";
import { PortalShell, Message } from "./shell";
import { ChildrenPanel } from "./children";
import { ExaminationHistory } from "./history";
import { MonitoringPanel } from "./monitoring";
import { DeviceMonitoringPanel } from "./device-monitoring";
import { InsightsPanel } from "./insights";
import { SettingsPanel } from "./settings";

type DashboardMode = "staff" | "admin";
type DashboardTab = "home" | "children" | "history" | "insights" | "account";

function AccountPanel({
  user,
  onLogout,
}: {
  user: Staff;
  onLogout: () => Promise<void>;
}) {
  return (
    <section className="portal-card staff-profile-card">
      <div className="staff-profile-avatar">
        {user.name.slice(0, 1).toUpperCase()}
      </div>
      <div className="staff-profile-copy">
        <span>{user.role === "admin" ? "ADMIN" : "PETUGAS"}</span>
        <h2>{user.name}</h2>
        <p>{user.email}</p>
      </div>
      <button className="portal-secondary" onClick={() => void onLogout()}>
        <LogOut size={18} />
        Keluar
      </button>
    </section>
  );
}

export function StaffDashboard({ mode = "staff" }: { mode?: DashboardMode }) {
  const router = useRouter();
  const [user, setUser] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DashboardTab>("home");
  const [error, setError] = useState("");
  const [facility, setFacility] = useState("StuntSpecula");

  useEffect(() => {
    const controller = new AbortController();

    api<Staff>("/auth/me", { signal: controller.signal })
      .then((value) => {
        if (mode === "admin" && value.role !== "admin") {
          router.replace("/petugas");
          return;
        }
        if (mode === "staff" && value.role === "admin") {
          router.replace("/admin");
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

    api<{ facility: string }>("/config", { signal: controller.signal })
      .then((value) => setFacility(value.facility))
      .catch(() => {});

    return () => controller.abort();
  }, [mode, router]);

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST", body: {} });
    } finally {
      router.replace("/login");
    }
  }

  if (loading || !user) {
    return (
      <PortalShell
        tone="staff"
        heading={loading ? "Menyiapkan akun" : "Mengalihkan ke login"}
      >
        <Message>{loading ? "Memeriksa sesi…" : "Sebentar…"}</Message>
      </PortalShell>
    );
  }

  const admin = user.role === "admin";

  return (
    <PortalShell
      tone="staff"
      heading={`Halo, ${user.name}`}
      subtitle={facility}
      actions={
        <button className="portal-text portal-logout-desktop" onClick={logout}>
          <LogOut size={18} />
          Keluar
        </button>
      }
    >
      <nav className="portal-nav staff-desktop-nav" aria-label="Menu dashboard">
        <button
          aria-current={tab === "home" ? "page" : undefined}
          onClick={() => setTab("home")}
        >
          <Home /> Beranda
        </button>
        <button
          aria-current={tab === "children" ? "page" : undefined}
          onClick={() => setTab("children")}
        >
          <UsersRound /> Data anak
        </button>
        <button
          aria-current={tab === "history" ? "page" : undefined}
          onClick={() => setTab("history")}
        >
          <History /> Riwayat
        </button>
        <button
          aria-current={tab === "insights" ? "page" : undefined}
          onClick={() => setTab("insights")}
        >
          <BarChart3 /> Insight
        </button>
        <button
          aria-current={tab === "account" ? "page" : undefined}
          onClick={() => setTab("account")}
        >
          {admin ? <Settings /> : <UserRound />}
          {admin ? "Admin" : "Profil"}
        </button>
      </nav>

      {error && <Message error>{error}</Message>}

      <div className="portal-content staff-portal-content">
        {tab === "home" && <MonitoringPanel />}
        {tab === "children" && <ChildrenPanel />}
        {tab === "history" && <ExaminationHistory />}
        {tab === "insights" && <InsightsPanel />}
        {tab === "account" &&
          (admin ? (
            <div className="admin-one-page">
              <DeviceMonitoringPanel />
              <SettingsPanel user={user} />
              <AccountPanel user={user} onLogout={logout} />
            </div>
          ) : (
            <AccountPanel user={user} onLogout={logout} />
          ))}
      </div>

      <nav className="staff-mobile-nav" aria-label="Navigasi dashboard">
        <button
          aria-current={tab === "home" ? "page" : undefined}
          onClick={() => setTab("home")}
        >
          <Home />
          <span>Home</span>
        </button>
        <button
          aria-current={tab === "children" ? "page" : undefined}
          onClick={() => setTab("children")}
        >
          <UsersRound />
          <span>Anak</span>
        </button>
        <button
          aria-current={tab === "history" ? "page" : undefined}
          onClick={() => setTab("history")}
        >
          <History />
          <span>Riwayat</span>
        </button>
        <button
          aria-current={tab === "insights" ? "page" : undefined}
          onClick={() => setTab("insights")}
        >
          <BarChart3 />
          <span>Insight</span>
        </button>
        <button
          aria-current={tab === "account" ? "page" : undefined}
          onClick={() => setTab("account")}
        >
          {admin ? <Settings /> : <UserRound />}
          <span>{admin ? "Admin" : "Profil"}</span>
        </button>
      </nav>
    </PortalShell>
  );
}
