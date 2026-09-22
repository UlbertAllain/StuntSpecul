"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  History,
  Home,
  LogOut,
  MonitorCog,
  UserRound,
  UserRoundCog,
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

type StaffTab = "home" | "children" | "history" | "insights" | "profile";
type AdminTab = "device" | "staff";

function useStaffSession(expected: "staff" | "admin") {
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

function ProfilePanel({
  user,
  onLogout,
}: {
  user: Staff;
  onLogout: () => Promise<void>;
}) {
  return (
    <section className="ref-card staff-profile-card">
      <div className="staff-profile-avatar">
        {user.name.slice(0, 1).toUpperCase()}
      </div>
      <div className="staff-profile-copy">
        <span>PETUGAS</span>
        <h2>{user.name}</h2>
        <p>{user.email}</p>
      </div>
      <button className="portal-secondary" onClick={() => void onLogout()}>
        <LogOut size={18} /> Keluar
      </button>
    </section>
  );
}

export function StaffDashboard() {
  const { user, loading, error, logout } = useStaffSession("staff");
  const [tab, setTab] = useState<StaffTab>("home");

  if (loading || !user) {
    return (
      <PortalShell tone="staff" heading="Petugas">
        <Message>{loading ? "Memeriksa sesi…" : "Mengalihkan…"}</Message>
      </PortalShell>
    );
  }

  const items = [
    ["home", Home, "Beranda"],
    ["children", UsersRound, "Data anak"],
    ["history", History, "Riwayat"],
    ["insights", BarChart3, "Insight"],
    ["profile", UserRound, "Profil"],
  ] as const;

  return (
    <PortalShell
      tone="staff"
      heading={`Halo, ${user.name}`}
      subtitle="Pantau pemeriksaan dan data pertumbuhan anak dengan cepat."
      actions={
        <button className="portal-text portal-logout-desktop" onClick={logout}>
          <LogOut size={18} /> Keluar
        </button>
      }
    >
      <nav className="portal-nav staff-desktop-nav" aria-label="Menu petugas">
        {items.map(([key, Icon, label]) => (
          <button
            key={key}
            aria-current={tab === key ? "page" : undefined}
            onClick={() => setTab(key)}
          >
            <Icon /> {label}
          </button>
        ))}
      </nav>

      {error && <Message error>{error}</Message>}

      <div className="portal-content staff-portal-content">
        {tab === "home" && <MonitoringPanel />}
        {tab === "children" && <ChildrenPanel />}
        {tab === "history" && <ExaminationHistory />}
        {tab === "insights" && <InsightsPanel />}
        {tab === "profile" && <ProfilePanel user={user} onLogout={logout} />}
      </div>

      <nav className="staff-mobile-nav" aria-label="Navigasi petugas">
        {items.map(([key, Icon, label]) => (
          <button
            key={key}
            aria-current={tab === key ? "page" : undefined}
            onClick={() => setTab(key)}
          >
            <Icon />
            <span>{label === "Data anak" ? "Anak" : label}</span>
          </button>
        ))}
      </nav>
    </PortalShell>
  );
}

export function AdminDashboard() {
  const { user, loading, error, logout } = useStaffSession("admin");
  const [tab, setTab] = useState<AdminTab>("device");

  if (loading || !user) {
    return (
      <PortalShell tone="staff" heading="Admin">
        <Message>{loading ? "Memeriksa sesi…" : "Mengalihkan…"}</Message>
      </PortalShell>
    );
  }

  return (
    <PortalShell
      tone="staff"
      heading="Admin StuntSpecula"
      subtitle="Kelola perangkat dan akun petugas."
      actions={
        <button className="portal-text" onClick={logout}>
          <LogOut size={18} /> Keluar
        </button>
      }
    >
      <nav className="portal-nav admin-role-nav" aria-label="Menu admin">
        <button
          aria-current={tab === "device" ? "page" : undefined}
          onClick={() => setTab("device")}
        >
          <MonitorCog /> Monitoring alat
        </button>
        <button
          aria-current={tab === "staff" ? "page" : undefined}
          onClick={() => setTab("staff")}
        >
          <UserRoundCog /> Kelola petugas
        </button>
      </nav>

      {error && <Message error>{error}</Message>}
      <div className="portal-content admin-portal-content">
        {tab === "device" && <DeviceMonitoringPanel />}
        {tab === "staff" && <SettingsPanel />}
      </div>
    </PortalShell>
  );
}
