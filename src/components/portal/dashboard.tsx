"use client";
import { useEffect, useState } from "react";
import {
  BarChart3,
  History,
  LayoutDashboard,
  LogOut,
  MonitorCog,
  Settings,
  UsersRound,
} from "lucide-react";
import { api, ClientError, errorMessage } from "@/lib/api-client";
import type { Staff } from "@/lib/portal";
import { StaffLogin } from "./login";
import { PortalShell, Message } from "./shell";
import { ChildrenPanel } from "./children";
import { ExaminationHistory } from "./history";
import { MonitoringPanel } from "./monitoring";
import { DeviceMonitoringPanel } from "./device-monitoring";
import { InsightsPanel } from "./insights";
import { SettingsPanel } from "./settings";

type DashboardTab =
  | "monitoring"
  | "children"
  | "history"
  | "devices"
  | "insights"
  | "settings";

export function StaffDashboard() {
  const [user, setUser] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DashboardTab>("monitoring");
  const [error, setError] = useState("");
  const [facility, setFacility] = useState("Fasilitas StuntSpecula");

  useEffect(() => {
    const controller = new AbortController();
    api<Staff>("/auth/me", { signal: controller.signal })
      .then(setUser)
      .catch((e) => {
        if (
          !controller.signal.aborted &&
          (!(e instanceof ClientError) || e.status !== 401)
        )
          setError(errorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    api<{ facility: string }>("/config", { signal: controller.signal })
      .then((c) => setFacility(c.facility))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST", body: {} });
      setUser(null);
      setTab("monitoring");
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (loading)
    return (
      <PortalShell heading="Menyiapkan ruang petugas">
        <Message>Memeriksa sesi…</Message>
      </PortalShell>
    );
  if (!user) return <StaffLogin onLogin={setUser} />;

  return (
    <PortalShell
      heading={facility}
      subtitle={`Halo, ${user.name}. Kelola pemeriksaan, pantau alat, dan lihat perkembangan layanan dari satu dashboard.`}
      actions={
        <button className="portal-text" onClick={logout}>
          <LogOut size={18} />
          Keluar
        </button>
      }
    >
      <nav className="portal-nav" aria-label="Menu petugas">
        <button
          aria-current={tab === "monitoring" ? "page" : undefined}
          onClick={() => setTab("monitoring")}
        >
          <LayoutDashboard />
          Dashboard
        </button>
        <button
          aria-current={tab === "children" ? "page" : undefined}
          onClick={() => setTab("children")}
        >
          <UsersRound />
          Data anak
        </button>
        <button
          aria-current={tab === "history" ? "page" : undefined}
          onClick={() => setTab("history")}
        >
          <History />
          Riwayat
        </button>
        <button
          aria-current={tab === "devices" ? "page" : undefined}
          onClick={() => setTab("devices")}
        >
          <MonitorCog />
          Monitoring alat
        </button>
        {user.role === "admin" && (
          <>
            <button
              aria-current={tab === "insights" ? "page" : undefined}
              onClick={() => setTab("insights")}
            >
              <BarChart3 />
              Insight
            </button>
            <button
              aria-current={tab === "settings" ? "page" : undefined}
              onClick={() => setTab("settings")}
            >
              <Settings />
              Kelola petugas
            </button>
          </>
        )}
      </nav>

      {error && <Message error>{error}</Message>}
      <div className="portal-content" key={tab}>
        {tab === "monitoring" ? (
          <MonitoringPanel />
        ) : tab === "children" ? (
          <ChildrenPanel />
        ) : tab === "history" ? (
          <ExaminationHistory />
        ) : tab === "devices" ? (
          <DeviceMonitoringPanel />
        ) : tab === "insights" ? (
          <InsightsPanel />
        ) : (
          <SettingsPanel user={user} />
        )}
      </div>
    </PortalShell>
  );
}
