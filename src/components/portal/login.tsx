"use client";
import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import type { Staff } from "@/lib/portal";
import { Message, PortalShell } from "./shell";

type Config = {
  needsSetup: boolean;
  canSetup: boolean;
  facility: string;
  aiAvailable: boolean;
};
export function StaffLogin({ onLogin }: { onLogin: (staff: Staff) => void }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api<Config>("/config", { signal: controller.signal })
      .then(setConfig)
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      });
    return () => controller.abort();
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      onLogin(
        await api<Staff>(config?.needsSetup ? "/auth/setup" : "/auth/login", {
          method: "POST",
          body: values,
        }),
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <PortalShell
      heading={
        config?.needsSetup
          ? "Siapkan fasilitas Anda"
          : "Selamat datang, petugas"
      }
      subtitle={
        config?.needsSetup
          ? "Buat akun pengelola pertama untuk memulai."
          : "Masuk untuk mengelola pemeriksaan dan mendampingi keluarga."
      }
    >
      <form className="portal-card login-card" onSubmit={submit}>
        {!config && !error && <Message>Menghubungkan layanan…</Message>}
        {config?.needsSetup && (
          <>
            <label>
              Nama fasilitas
              <input
                name="facility"
                required
                minLength={2}
                maxLength={80}
                autoComplete="organization"
              />
            </label>
            <label>
              Nama pengelola
              <input
                name="name"
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
              />
            </label>
          </>
        )}
        <label>
          Email
          <input
            name="email"
            type="email"
            required
            maxLength={160}
            autoComplete="username"
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            required
            minLength={config?.needsSetup ? 12 : 1}
            maxLength={72}
            autoComplete={
              config?.needsSetup ? "new-password" : "current-password"
            }
          />
        </label>
        {config?.needsSetup && !config.canSetup && (
          <Message error>
            Buka dari localhost atau akses pemilik hosting untuk membuat
            pengelola pertama.
          </Message>
        )}
        {error && <Message error>{error}</Message>}
        <button
          className="portal-primary"
          disabled={busy || !config || (config.needsSetup && !config.canSetup)}
        >
          {busy
            ? "Memproses…"
            : config?.needsSetup
              ? "Buat akun pengelola"
              : "Masuk"}
        </button>
        <p className="portal-note">
          Akun petugas diberikan oleh pengelola fasilitas.
        </p>
      </form>
    </PortalShell>
  );
}
