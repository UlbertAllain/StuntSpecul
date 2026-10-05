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
    measurementReviewStatus: "none" | "verified_extreme";
    measurementReviewNote: string | null;
  } | null;
  checks: {
    application: DeviceCheck;
    heightSensor: DeviceCheck;
    weightSensor: DeviceCheck;
    camera: DeviceCheck;
  };
};

type DeviceMonitoringResponse = {
  debug: {
    serverActiveExamId: string | null;
    stationActiveExamId: string | null;
    deviceClaimedExamId: string | null;
    deviceCurrentExamId: string | null;
    deviceLocalSessionState:
      | "idle"
      | "queued"
      | "measuring"
      | "error"
      | "unknown";
    wifiConnected: boolean | null;
    expectedResetToken: string | null;
    appliedResetToken: string | null;
    resetRequestedAt: number | null;
    resetReason: string | null;
    resetPending: boolean;
    stateMismatch: boolean;
    stuckSessions: Array<{
      id: string;
      childName: string;
      status: "queued" | "running";
      createdAt: number;
    }>;
  };
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
  const [forceStopping, setForceStopping] = useState(false);
  const [cleaningStuck, setCleaningStuck] = useState(false);
  const [confirmingExtreme, setConfirmingExtreme] = useState(false);
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

  async function forceStop() {
    if (forceStopping) return;
    if (
      !window.confirm(
        "Paksa hentikan sesi akan membatalkan sesi aktif di server dan mengirim reset token baru ke alat. Riwayat audit tetap disimpan. Lanjutkan?",
      )
    )
      return;

    setForceStopping(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{ message: string }>("/device/force-stop", {
        method: "POST",
        body: {},
      });
      setNotice(result.message);
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setForceStopping(false);
    }
  }

  async function cleanupStuckSessions() {
    if (cleaningStuck) return;
    if (
      !window.confirm(
        "Sesi queued/running yang tidak lagi terhubung ke station akan ditandai batal. Data tidak dihapus. Lanjutkan?",
      )
    )
      return;

    setCleaningStuck(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{ message: string }>(
        "/device/cleanup-stuck-sessions",
        {
          method: "POST",
          body: {},
        },
      );
      setNotice(result.message);
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setCleaningStuck(false);
    }
  }

  async function confirmExtreme(examinationId: string) {
    if (confirmingExtreme) return;
    if (
      !window.confirm(
        "Gunakan hanya setelah pengukuran diulang dan petugas sudah memastikan posisi anak serta alat benar. Nilai mentah akan disimpan sebagai ekstrem terverifikasi tanpa memaksakan status pertumbuhan otomatis. Lanjutkan?",
      )
    )
      return;

    setConfirmingExtreme(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{ message: string }>("/device/confirm-extreme", {
        method: "POST",
        body: { examinationId },
      });
      setNotice(result.message);
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setConfirmingExtreme(false);
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
          <section
            className={`ref-device-debug ${data.debug.stateMismatch ? "has-warning" : ""}`}
          >
            <div className="ref-device-debug-head">
              <div>
                <span>DIAGNOSTIK SINKRONISASI</span>
                <strong>
                  {data.debug.stateMismatch
                    ? "State server dan alat perlu dicek"
                    : "State server dan alat konsisten"}
                </strong>
                <p>
                  Panel ini membedakan sesi yang tercatat di server dengan sesi
                  lokal yang dilaporkan firmware alat.
                </p>
              </div>
              <div className="ref-device-debug-actions">
                <button
                  className="portal-secondary"
                  disabled={resetting}
                  onClick={() =>
                    void resetDevice(!!data.debug.serverActiveExamId)
                  }
                >
                  {resetting ? "Mereset…" : "Reset buffer / sinkron ulang"}
                </button>
                <button
                  className="portal-secondary"
                  disabled={forceStopping}
                  onClick={() => void forceStop()}
                >
                  {forceStopping ? "Menghentikan…" : "Paksa hentikan sesi"}
                </button>
                {data.debug.stuckSessions.length > 0 && (
                  <button
                    className="portal-secondary"
                    disabled={cleaningStuck}
                    onClick={() => void cleanupStuckSessions()}
                  >
                    {cleaningStuck
                      ? "Membersihkan…"
                      : `Bersihkan ${data.debug.stuckSessions.length} sesi nyangkut`}
                  </button>
                )}
              </div>
            </div>

            <div className="ref-device-debug-grid">
              <span>
                Sesi aktif server
                <strong>{data.debug.serverActiveExamId || "Tidak ada"}</strong>
              </span>
              <span>
                Claim perangkat
                <strong>{data.debug.deviceClaimedExamId || "Tidak ada"}</strong>
              </span>
              <span>
                Sesi lokal alat
                <strong>
                  {data.debug.deviceCurrentExamId || "Tidak dilaporkan"}
                </strong>
              </span>
              <span>
                State lokal alat
                <strong>{data.debug.deviceLocalSessionState}</strong>
              </span>
              <span>
                WiFi terakhir dilaporkan
                <strong>
                  {data.debug.wifiConnected === null
                    ? "Belum dilaporkan"
                    : data.debug.wifiConnected
                      ? "Tersambung"
                      : "Terputus"}
                </strong>
              </span>
              <span>
                ACK reset
                <strong>
                  {data.debug.resetPending
                    ? "Menunggu alat"
                    : data.debug.expectedResetToken
                      ? "Sudah diterapkan"
                      : "Belum ada reset"}
                </strong>
              </span>
            </div>

            {data.debug.resetPending && (
              <p className="ref-device-debug-warning">
                Server sudah mengirim reset token baru, tetapi firmware belum
                mengonfirmasi token tersebut. Pada firmware lama field ACK
                mungkin belum dilaporkan.
              </p>
            )}

            {data.debug.stuckSessions.length > 0 && (
              <div className="ref-stuck-session-list">
                <strong>Sesi tersembunyi / nyangkut</strong>
                {data.debug.stuckSessions.map((session) => (
                  <span key={session.id}>
                    {session.childName} · {session.status} ·{" "}
                    {new Date(session.createdAt).toLocaleString("id-ID")}
                  </span>
                ))}
              </div>
            )}
          </section>

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
                  <strong>
                    {item.examination.measurementReviewStatus ===
                    "verified_extreme"
                      ? "Nilai ekstrem sudah diverifikasi"
                      : "Pengukuran perlu diulang"}
                  </strong>
                  <span>
                    {item.examination.measurementReviewNote ||
                      item.examination.measurementIssue}
                  </span>
                  {item.examination.measurementReviewStatus !==
                    "verified_extreme" && (
                    <button
                      type="button"
                      className="portal-secondary"
                      disabled={confirmingExtreme}
                      onClick={() =>
                        void confirmExtreme(data.debug.serverActiveExamId || "")
                      }
                    >
                      {confirmingExtreme
                        ? "Mengonfirmasi…"
                        : "Konfirmasi nilai ekstrem"}
                    </button>
                  )}
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
