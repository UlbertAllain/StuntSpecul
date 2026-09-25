"use client";

import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  History,
  Home,
  LogOut,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { Staff } from "@/lib/portal";
import { Message, PortalShell } from "../shared/shell";
import { useStaffSession } from "../shared/staff-session";
import { BlogPanel } from "./blogs";
import { ChildrenPanel } from "./children";
import { ExaminationHistory } from "./history";
import { InsightsPanel } from "./insights";
import { MonitoringPanel } from "./monitoring";

type StaffTab =
  | "home"
  | "children"
  | "history"
  | "insights"
  | "blog"
  | "profile";

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
    ["blog", BookOpen, "Blog"],
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
        {tab === "blog" && <BlogPanel />}
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
