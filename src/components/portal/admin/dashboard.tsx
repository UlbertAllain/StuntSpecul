"use client";

import { useState } from "react";
import { LogOut, MonitorCog, UserRoundCog } from "lucide-react";
import { Message, PortalShell } from "../shared/shell";
import { useStaffSession } from "../shared/staff-session";
import { DeviceMonitoringPanel } from "./device-monitoring";
import { SettingsPanel } from "./settings";

type AdminTab = "device" | "staff";

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
