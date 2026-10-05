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
  RotateCcw,
  Ruler,
  Scale,
  Wifi,
  WifiOff,
} from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { Message } from "../shared/shell";

type DeviceCheck = "normal" | "offline" | "pending_hardware" | "app_ready";

type DeviceState = {
  id: string;
  name: string;
  online: boolean;
  lastSeen: number | null;
  status: "offline" | "ready" | "assigned" | "in_use";
  firmwareVersion: string | null;
  resetRequestedAt: number | null;
  examination: {
    status: "queued" | "running" | "completed";
    createdAt: number;
    childName: string;
    heightCm: number | null;
    weightKg: number | null;
    measurementUpdatedAt: number | null;
    measurementSource: "iot" | null;
    measurementIssue: string | null;
    measurementIssueAt: number | null;
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
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState("");

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

  async function resetDevice(hasActiveSession: boolean) {
    if (resetting) return;
    const message = hasActiveSession
      ? "Refresh alat akan menghapus hasil tinggi/berat sementara dan mengulang sesi aktif dari awal. Lanjutkan?"
      : "Refresh alat akan mereset state/handshake perangkat. Lanjutkan?";
    if (!window.confirm(message)) return;

    setResetting(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{ message: string }>("/device/reset-session", {
        method: "POST",
        body: {},
      });
      setNotice(result.message);
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setResetting(false);
    }
  }

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

      {notice && <Message>{notice}</Message>}
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
                <div className="ref-device-head-actions">
                  <div className="ref-last-seen">
                    <Clock3 />
                    <span>{lastSeenLabel(item.lastSeen)}</span>
                  </div>
                  <button
                    className="portal-secondary ref-device-reset"
                    disabled={resetting}
                    onClick={() => void resetDevice(!!item.examination)}
                  >
                    <RotateCcw size={15} />
                    {resetting ? "Me-refresh…" : "Refresh alat"}
                  </button>
                </div>
              </div>

              <div className="ref-device-diagnostics">
                <span>
                  Firmware
                  <strong>{item.firmwareVersion || "Belum dilaporkan"}</strong>
                </span>
                <span>
                  Refresh terakhir
                  <strong>
                    {item.resetRequestedAt
                      ? new Date(item.resetRequestedAt).toLocaleTimeString(
                          "id-ID",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          },
                        )
                      : "Belum pernah"}
                  </strong>
                </span>
                <span>
                  Measurement terakhir
                  <strong>
                    {item.examination?.measurementUpdatedAt
                      ? new Date(
                          item.examination.measurementUpdatedAt,
                        ).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })
                      : "Belum ada"}
                  </strong>
                </span>
                <span>
                  Tinggi diterima
                  <strong>
                    {item.examination?.heightCm === null ||
                    item.examination?.heightCm === undefined
                      ? "—"
                      : `${item.examination.heightCm} cm`}
                  </strong>
                </span>
                <span>
                  Berat diterima
                  <strong>
                    {item.examination?.weightKg === null ||
                    item.examination?.weightKg === undefined
                      ? "—"
                      : `${item.examination.weightKg} kg`}
                  </strong>
                </span>
              </div>

              {item.examination?.measurementIssue && (
                <div className="ref-device-measurement-alert">
                  <strong>Pengukuran perlu diulang</strong>
                  <span>{item.examination.measurementIssue}</span>
                </div>
              )}

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
