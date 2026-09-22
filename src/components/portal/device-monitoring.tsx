"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Camera,
  CircleCheck,
  CircleOff,
  Clock3,
  Cpu,
  MonitorCheck,
  RefreshCw,
  Ruler,
  Scale,
  Wifi,
  WifiOff,
} from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { Message } from "./shell";

type DeviceCheck = "normal" | "offline" | "pending_hardware" | "app_ready";

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
  if (status === "app_ready") return "Siap";
  if (status === "offline") return "Offline";
  return "Menunggu IoT";
}

function lastSeenLabel(lastSeen: number | null) {
  if (!lastSeen) return "Belum terhubung";
  const seconds = Math.max(0, Math.floor((Date.now() - lastSeen) / 1000));
  if (seconds < 10) return "Baru saja";
  if (seconds < 60) return `${seconds} detik lalu`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  return new Date(lastSeen).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
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
    <div className="ref-check-row">
      <span>
        <Icon />
        {label}
      </span>
      <strong>
        {available ? <CircleCheck /> : <CircleOff />}
        {checkLabel(status)}
      </strong>
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
        const value = await api<DeviceMonitoringResponse>(
          "/device-monitoring",
          {
            signal: controller.signal,
          },
        );
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

  const online = data?.devices.filter((item) => item.online).length ?? 0;
  const active =
    data?.devices.filter((item) => item.status === "in_use").length ?? 0;
  const ready =
    data?.devices.filter((item) => item.status === "ready").length ?? 0;

  return (
    <>
      <div className="section-heading compact-section-heading">
        <div>
          <h2>Monitoring alat</h2>
          <p className="portal-note">
            Pantau koneksi, status pemeriksaan, dan kesiapan perangkat.
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

      {data && (
        <>
          <div className="ref-stat-grid ref-stat-grid-three">
            <article>
              <span className="ref-stat-icon blue">
                <Wifi />
              </span>
              <strong>{online}</strong>
              <p>Alat online</p>
            </article>
            <article>
              <span className="ref-stat-icon green">
                <MonitorCheck />
              </span>
              <strong>{ready}</strong>
              <p>Siap digunakan</p>
            </article>
            <article>
              <span className="ref-stat-icon pink">
                <Activity />
              </span>
              <strong>{active}</strong>
              <p>Sedang digunakan</p>
            </article>
          </div>

          {data.devices.map((item) => (
            <section className="ref-device-card" key={item.id}>
              <div className="ref-device-head">
                <span
                  className={`ref-device-icon ${item.online ? "online" : "offline"}`}
                >
                  {item.online ? <Wifi /> : <WifiOff />}
                </span>
                <div>
                  <h3>{item.name}</h3>
                  <p>{STATUS_LABEL[item.status]}</p>
                </div>
                <div className="ref-last-seen">
                  <Clock3 />
                  <span>{lastSeenLabel(item.lastSeen)}</span>
                </div>
              </div>

              <div className="ref-device-grid">
                <div className="ref-device-session">
                  <span>SESI PEMERIKSAAN</span>
                  {item.examination ? (
                    <>
                      <strong>{item.examination.childName}</strong>
                      <p>
                        {item.examination.status === "queued"
                          ? "Menunggu dimulai"
                          : item.examination.status === "running"
                            ? "Sedang diperiksa"
                            : "Menunggu sesi diselesaikan"}
                      </p>
                    </>
                  ) : (
                    <>
                      <strong>Tidak ada sesi aktif</strong>
                      <p>Alat siap menerima pemeriksaan berikutnya.</p>
                    </>
                  )}
                </div>

                <div className="ref-device-checks">
                  <CheckRow
                    icon={Cpu}
                    label="Aplikasi alat"
                    status={item.checks.application}
                  />
                  <CheckRow
                    icon={Camera}
                    label="Kamera"
                    status={item.checks.camera}
                  />
                  <CheckRow
                    icon={Ruler}
                    label="Sensor tinggi"
                    status={item.checks.heightSensor}
                  />
                  <CheckRow
                    icon={Scale}
                    label="Sensor berat"
                    status={item.checks.weightSensor}
                  />
                </div>
              </div>
            </section>
          ))}
        </>
      )}
    </>
  );
}
