"use client";

import { useState } from "react";
import { LogOut, MonitorCog, ScanFace, UserRoundCog } from "lucide-react";
import { Message, PortalShell } from "../shared/shell";
import { useStaffSession } from "../shared/staff-session";
import { DeviceMonitoringPanel } from "./device-monitoring";
import { FaceTestPanel } from "./face-test";
import { SettingsPanel } from "./settings";

type AdminTab = "device" | "face-test" | "staff";

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
      subtitle="Kelola perangkat, pengujian, dan akun petugas."
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
          aria-current={tab === "face-test" ? "page" : undefined}
          onClick={() => setTab("face-test")}
        >
          <ScanFace /> Pengujian wajah
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
        {tab === "face-test" && <FaceTestPanel />}
        {tab === "staff" && <SettingsPanel />}
      </div>
    </PortalShell>
  );
}
