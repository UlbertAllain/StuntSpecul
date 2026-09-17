"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Camera,
  CircleCheck,
  CircleOff,
  Cpu,
  RefreshCw,
  Ruler,
  Scale,
} from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { Message } from "./shell";

type DeviceCheck =
  | "normal"
  | "offline"
  | "pending_hardware"
  | "app_ready";

type DeviceState = {
  id: string;
  name: string;
  online: boolean;
  lastSeen: number | null;
  status: "offline" | "ready" | "assigned" | "in_use";
  examination: {
    status: "queued" | "running" | "completed";
    createdAt: number;
    childName: string;
  } | null;
  checks: {
    application: DeviceCheck;
    heightSensor: DeviceCheck;
    weightSensor: DeviceCheck;
    camera: DeviceCheck;
  };
};

type DeviceMonitoringResponse = {
  devices: DeviceState[];
  generatedAt: number;
};

const STATUS_LABEL = {
  offline: "Offline",
  ready: "Siap digunakan",
  assigned: "Pemeriksaan disiapkan",
  in_use: "Sedang digunakan",
};

function checkLabel(status: DeviceCheck) {
  if (status === "normal") return "Normal";
  if (status === "app_ready") return "Siap di aplikasi";
  if (status === "offline") return "Tidak terhubung";
  return "Menunggu perangkat IoT";
}

function CheckRow({
  icon: Icon,
  label,
  status,
}: {
  icon: typeof Cpu;
  label: string;
  status: DeviceCheck;
}) {
  const available = status === "normal" || status === "app_ready";
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] py-3 last:border-0">
      <span className="flex items-center gap-3 text-sm font-bold">
        <Icon size={18} className="text-[var(--blue)]" /> {label}
      </span>
      <span className="flex items-center gap-2 text-right text-xs font-bold text-[var(--muted-foreground)]">
        {available ? <CircleCheck size={16} /> : <CircleOff size={16} />}
        {checkLabel(status)}
      </span>
    </div>
  );
}

export function DeviceMonitoringPanel() {
  const [data, setData] = useState<DeviceMonitoringResponse | null>(null);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;

    async function load(silent = false) {
      if (!silent) setRefreshing(true);
      try {
        const value = await api<DeviceMonitoringResponse>("/device-monitoring", {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setData(value);
        setError("");
      } catch (cause) {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      } finally {
        if (!controller.signal.aborted) {
          setRefreshing(false);
          timer = setTimeout(() => void load(true), 5000);
        }
      }
    }

    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [refreshKey]);

  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Monitoring alat</h2>
          <p className="portal-note">
            Pantau koneksi layar pemeriksaan dan kesiapan integrasi perangkat IoT.
          </p>
        </div>
        <button
          className="portal-text"
          disabled={refreshing}
          onClick={() => setRefreshKey((value) => value + 1)}
        >
          <RefreshCw size={17} />
          {refreshing ? "Memperbarui…" : "Perbarui"}
        </button>
      </div>

      {error && <Message error>{error}</Message>}
      {!data && !error && <Message>Memuat status alat…</Message>}

      {data?.devices.map((device) => (
        <section className="portal-card" key={device.id}>
          <div className="section-heading">
            <div>
              <div className="flex items-center gap-3">
                <span
                  className={`h-3 w-3 rounded-full ${device.online ? "bg-emerald-500" : "bg-slate-400"}`}
                />
                <h3 className="!mb-0">{device.name}</h3>
              </div>
              <p className="portal-note !mt-2">
                {device.lastSeen
                  ? `Terakhir terhubung ${new Date(device.lastSeen).toLocaleString("id-ID", { timeStyle: "medium", dateStyle: "medium" })}`
                  : "Alat belum pernah terhubung ke sistem."}
              </p>
            </div>
            <span
              className={`status-label ${device.online ? "status-completed" : "status-cancelled"}`}
            >
              {STATUS_LABEL[device.status]}
            </span>
          </div>

          {device.examination && (
            <div className="portal-message">
              <strong>{device.examination.childName}</strong> ·{" "}
              {device.examination.status === "queued"
                ? "menunggu dimulai"
                : device.examination.status === "running"
                  ? "sedang diperiksa"
                  : "menunggu konfirmasi petugas"}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] p-5">
              <h3 className="!mb-2">
                <Activity size={19} /> Status sistem
              </h3>
              <CheckRow
                icon={Cpu}
                label="Aplikasi alat"
                status={device.checks.application}
              />
              <CheckRow
                icon={Camera}
                label="Kamera aplikasi"
                status={device.checks.camera}
              />
            </div>
            <div className="rounded-2xl border border-[var(--border)] p-5">
              <h3 className="!mb-2">
                <Cpu size={19} /> Perangkat IoT
              </h3>
              <CheckRow
                icon={Ruler}
                label="Sensor tinggi"
                status={device.checks.heightSensor}
              />
              <CheckRow
                icon={Scale}
                label="Sensor berat"
                status={device.checks.weightSensor}
              />
            </div>
          </div>

          <p className="portal-note">
            Status sensor tinggi dan berat akan berubah menjadi status perangkat
            nyata setelah modul IoT terhubung. Sistem tidak menampilkan status
            normal palsu selama hardware belum tersedia.
          </p>
        </section>
      ))}
    </>
  );
}
