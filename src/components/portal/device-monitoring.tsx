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

const STATUS_NOTE = {
  offline: "Layar alat tidak mengirim heartbeat dalam batas waktu yang ditentukan.",
  ready: "Layar alat terhubung dan siap menerima pemeriksaan berikutnya.",
  assigned: "Petugas sudah mengirim pemeriksaan ke alat dan menunggu proses dimulai.",
  in_use: "Alat sedang digunakan untuk pemeriksaan aktif.",
};

function checkLabel(status: DeviceCheck) {
  if (status === "normal") return "Normal";
  if (status === "app_ready") return "Siap di aplikasi";
  if (status === "offline") return "Tidak terhubung";
  return "Menunggu perangkat IoT";
}

function lastSeenLabel(lastSeen: number | null) {
  if (!lastSeen) return "Belum pernah terhubung";
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
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] py-3.5 last:border-0">
      <span className="flex items-center gap-3 text-sm font-bold">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eef6fb] text-[var(--blue)]">
          <Icon size={17} />
        </span>
        {label}
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

  const online = data?.devices.filter((device) => device.online).length ?? 0;
  const active =
    data?.devices.filter((device) => device.status === "in_use").length ?? 0;
  const ready =
    data?.devices.filter((device) => device.status === "ready").length ?? 0;

  return (
    <>
      <div className="section-heading">
        <div>
          <p className="mb-2 text-xs font-extrabold tracking-[0.11em] text-[var(--blue)]">
            OPERASIONAL PERANGKAT
          </p>
          <h2>Monitoring alat</h2>
          <p className="portal-note max-w-3xl">
            Pantau koneksi layar pemeriksaan, status sesi, dan kesiapan perangkat
            sebelum digunakan di lapangan.
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
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <article className="rounded-[1.5rem] border border-[var(--border)] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#eaf5fc] text-[var(--blue)]">
                  <Wifi size={20} />
                </span>
                <span className="text-xs font-bold text-[var(--muted-foreground)]">
                  {data.devices.length} alat terdaftar
                </span>
              </div>
              <strong className="mt-5 block text-3xl font-black">{online}</strong>
              <span className="mt-1 block text-sm font-bold">Alat online</span>
            </article>
            <article className="rounded-[1.5rem] border border-[var(--border)] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#eef8f1] text-[#39755a]">
                  <MonitorCheck size={20} />
                </span>
                <span className="text-xs font-bold text-[var(--muted-foreground)]">
                  Siap pemeriksaan
                </span>
              </div>
              <strong className="mt-5 block text-3xl font-black">{ready}</strong>
              <span className="mt-1 block text-sm font-bold">Dalam kondisi siap</span>
            </article>
            <article className="rounded-[1.5rem] border border-[var(--border)] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff1f5] text-[#bd4d78]">
                  <Activity size={20} />
                </span>
                <span className="text-xs font-bold text-[var(--muted-foreground)]">
                  Saat ini
                </span>
              </div>
              <strong className="mt-5 block text-3xl font-black">{active}</strong>
              <span className="mt-1 block text-sm font-bold">Sedang digunakan</span>
            </article>
          </div>

          <div className="grid gap-6">
            {data.devices.map((device) => (
              <section
                className="overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-white shadow-[0_14px_45px_rgba(36,79,112,.06)]"
                key={device.id}
              >
                <div className="grid gap-5 border-b border-[var(--border)] bg-[linear-gradient(135deg,#f7fbfe_0%,#eef7fc_100%)] p-6 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="flex items-start gap-4">
                    <span
                      className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${
                        device.online
                          ? "bg-[#dff3e8] text-[#39755a]"
                          : "bg-[#eef1f4] text-[#687985]"
                      }`}
                    >
                      {device.online ? <Wifi size={24} /> : <WifiOff size={24} />}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="!mb-0 text-xl">{device.name}</h3>
                        <span
                          className={`status-label ${device.online ? "status-completed" : "status-cancelled"}`}
                        >
                          {STATUS_LABEL[device.status]}
                        </span>
                      </div>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
                        {STATUS_NOTE[device.status]}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm">
                    <span className="flex items-center gap-2 text-xs font-bold text-[var(--muted-foreground)]">
                      <Clock3 size={15} /> Terakhir terhubung
                    </span>
                    <strong className="mt-1 block text-sm">
                      {lastSeenLabel(device.lastSeen)}
                    </strong>
                  </div>
                </div>

                <div className="grid gap-6 p-6 xl:grid-cols-[.85fr_1.15fr]">
                  <div>
                    <p className="text-xs font-extrabold tracking-[0.1em] text-[var(--muted-foreground)]">
                      SESI PEMERIKSAAN
                    </p>
                    {device.examination ? (
                      <div className="mt-3 rounded-2xl border border-[#d9e6ef] bg-[#f8fbfd] p-5">
                        <span className="text-xs font-bold text-[var(--muted-foreground)]">
                          Pemeriksaan aktif
                        </span>
                        <strong className="mt-2 block text-xl">
                          {device.examination.childName}
                        </strong>
                        <div className="mt-4 flex items-center gap-2 text-sm font-bold text-[var(--blue)]">
                          <Activity size={17} />
                          {device.examination.status === "queued"
                            ? "Menunggu dimulai"
                            : device.examination.status === "running"
                              ? "Sedang diperiksa"
                              : "Menunggu konfirmasi petugas"}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-2xl border border-dashed border-[#cfdde7] bg-[#fbfdfe] p-5">
                        <MonitorCheck className="text-[#80a2ba]" size={22} />
                        <strong className="mt-3 block">Tidak ada sesi aktif</strong>
                        <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                          Alat akan menerima pemeriksaan setelah petugas memilih anak
                          dari menu Data anak.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-[var(--border)] p-5">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="!mb-0">
                          <Activity size={19} /> Sistem aplikasi
                        </h3>
                        <span className="text-[11px] font-extrabold text-[#668096]">
                          LIVE
                        </span>
                      </div>
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
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="!mb-0">
                          <Cpu size={19} /> Perangkat IoT
                        </h3>
                        <span className="text-[11px] font-extrabold text-[#947088]">
                          PERSIAPAN
                        </span>
                      </div>
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
                </div>

                <div className="border-t border-[var(--border)] bg-[#fbfcfd] px-6 py-4 text-xs leading-5 text-[var(--muted-foreground)]">
                  Status sensor tinggi dan berat akan berubah menjadi telemetry nyata
                  setelah modul IoT terhubung. Selama hardware belum tersedia, sistem
                  sengaja tidak menampilkan status normal palsu.
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}
