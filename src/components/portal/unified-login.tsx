"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { api, ClientError, errorMessage } from "@/lib/api-client";

type LoginResult = {
  role: "parent" | "staff" | "admin";
  name: string;
  redirectTo: "/ortu" | "/petugas" | "/admin";
};

type Config = {
  needsSetup: boolean;
  canSetup: boolean;
  facility: string;
};

type Mode = "login" | "register" | "setup";

type GoogleRegistration = {
  name: string;
  email: string;
};

export function UnifiedLogin() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [config, setConfig] = useState<Config | null>(null);
  const [googleRegistration, setGoogleRegistration] =
    useState<GoogleRegistration | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const googleResult = new URLSearchParams(window.location.search).get(
      "google",
    );
    if (!googleResult) return;

    if (googleResult === "register_ready") {
      setMode("register");
      api<GoogleRegistration>("/auth/google/pending")
        .then((account) => {
          setGoogleRegistration(account);
          setError("");
        })
        .catch((cause) => setError(errorMessage(cause)));
      return;
    }

    window.history.replaceState(null, "", window.location.pathname);

    const googleMessages: Record<string, string> = {
      not_configured:
        "Google belum terhubung ke konfigurasi aplikasi. Gunakan email dan password terlebih dahulu.",
      cancelled: "Proses Google dibatalkan.",
      session_expired:
        "Sesi Google kedaluwarsa. Silakan coba kembali.",
      not_registered:
        "Akun Google ini belum terdaftar. Pilih Buat akun lalu lanjutkan dengan Google.",
      failed: "Proses Google belum berhasil. Silakan coba kembali.",
    };

    setError(
      googleMessages[googleResult] ||
        "Proses Google belum berhasil. Silakan coba kembali.",
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function detectSession() {
      try {
        const appConfig = await api<Config>("/config", {
          signal: controller.signal,
        });
        setConfig(appConfig);
        if (appConfig.needsSetup && appConfig.canSetup) {
          setMode("setup");
          setChecking(false);
          return;
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(errorMessage(cause));
          setChecking(false);
        }
        return;
      }

      try {
        const staff = await api<{ role: "admin" | "staff" }>("/auth/me", {
          signal: controller.signal,
        });
        router.replace(staff.role === "admin" ? "/admin" : "/petugas");
        return;
      } catch (cause) {
        if (
          controller.signal.aborted ||
          !(cause instanceof ClientError) ||
          cause.status !== 401
        ) {
          if (!controller.signal.aborted) setError(errorMessage(cause));
          setChecking(false);
          return;
        }
      }

      try {
        await api("/parent-account/me", { signal: controller.signal });
        router.replace("/ortu");
      } catch (cause) {
        if (
          !controller.signal.aborted &&
          (!(cause instanceof ClientError) || cause.status !== 401)
        ) {
          setError(errorMessage(cause));
        }
        if (!controller.signal.aborted) setChecking(false);
      }
    }

    void detectSession();
    return () => controller.abort();
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      if (mode === "setup") {
        await api("/auth/setup", {
          method: "POST",
          body: {
            facility: String(form.get("facility") || "StuntSpecula"),
            name: String(form.get("name") || ""),
            email: String(form.get("email") || ""),
            password: String(form.get("password") || ""),
          },
        });
        router.replace("/admin");
        return;
      }

      if (mode === "login") {
        const result = await api<LoginResult>("/auth/unified-login", {
          method: "POST",
          body: {
            email: String(form.get("email") || ""),
            password: String(form.get("password") || ""),
          },
        });
        router.replace(result.redirectTo);
        return;
      }

      const child = {
        name: String(form.get("childName") || ""),
        birthDate: String(form.get("birthDate") || ""),
        sex: String(form.get("sex") || ""),
      };

      if (googleRegistration) {
        await api("/parent-account/register-google", {
          method: "POST",
          body: { child },
        });
      } else {
        await api("/parent-account/register", {
          method: "POST",
          body: {
            name: String(form.get("name") || ""),
            email: String(form.get("email") || ""),
            password: String(form.get("password") || ""),
            child,
          },
        });
      }
      router.replace("/ortu");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <main className="unified-auth-page">
        <div className="unified-auth-loading">Memeriksa sesi…</div>
      </main>
    );
  }

  return (
    <main className="unified-auth-page">
      <section className="unified-auth-card">
        <div className="unified-auth-brand">
          <Image
            src="/images/stuntspecula-logo.jpeg"
            alt="StuntSpecula"
            width={1536}
            height={1024}
            priority
          />
        </div>

        <div className="unified-auth-copy">
          <h1>
            {mode === "login"
              ? "Selamat datang"
              : mode === "setup"
                ? "Buat admin pertama"
                : googleRegistration
                  ? "Lengkapi profil anak"
                  : "Buat akun orang tua"}
          </h1>
          <p>
            {mode === "login"
              ? "Masuk dengan satu akun. Sistem akan membuka halaman sesuai peran Anda."
              : mode === "setup"
                ? "Setup ini hanya muncul di localhost saat Firestore masih kosong."
                : googleRegistration
                  ? `Google terhubung sebagai ${googleRegistration.email}. Lengkapi profil anak untuk menyelesaikan pendaftaran.`
                  : "Daftarkan akun orang tua dan profil anak pertama."}
          </p>
        </div>

        <form className="unified-auth-form" onSubmit={submit}>
          {mode === "setup" && (
            <>
              <label>
                Nama fasilitas
                <span className="unified-input">
                  <UserRound size={18} />
                  <input
                    name="facility"
                    required
                    minLength={2}
                    maxLength={80}
                    defaultValue={config?.facility || "StuntSpecula"}
                    placeholder="Nama fasilitas"
                  />
                </span>
              </label>
            </>
          )}

          {(mode === "register" || mode === "setup") && (
            <>
              {(mode === "setup" || !googleRegistration) && (
                <label>
                  {mode === "setup" ? "Nama admin" : "Nama orang tua"}
                  <span className="unified-input">
                    <UserRound size={18} />
                    <input
                      name="name"
                      required
                      minLength={2}
                      maxLength={80}
                      autoComplete="name"
                      placeholder="Nama lengkap"
                    />
                  </span>
                </label>
              )}

              {mode === "register" && (
                <label>
                  Nama anak
                  <span className="unified-input">
                    <UserRound size={18} />
                    <input
                      name="childName"
                      required
                      minLength={2}
                      maxLength={80}
                      placeholder="Nama anak"
                    />
                  </span>
                </label>
              )}

              {mode === "register" && (
                <div className="unified-auth-grid">
                  <label>
                    Tanggal lahir
                    <input name="birthDate" type="date" required />
                  </label>
                  <label>
                    Jenis kelamin
                    <select name="sex" required defaultValue="">
                      <option value="" disabled>
                        Pilih
                      </option>
                      <option value="male">Laki-laki</option>
                      <option value="female">Perempuan</option>
                    </select>
                  </label>
                </div>
              )}
            </>
          )}

          {(mode !== "register" || !googleRegistration) && (
            <>
              <label>
                Email
                <span className="unified-input">
                  <Mail size={18} />
                  <input
                    name="email"
                    type="email"
                    required
                    maxLength={160}
                    autoComplete="username"
                    placeholder="nama@email.com"
                  />
                </span>
              </label>

              <label>
                Password
                <span className="unified-input">
                  <LockKeyhole size={18} />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={mode === "login" ? 1 : 8}
                    maxLength={72}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    placeholder={
                      mode === "login" ? "Password" : "Minimal 8 karakter"
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={
                      showPassword
                        ? "Sembunyikan password"
                        : "Tampilkan password"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>
            </>
          )}

          {error && <p className="unified-auth-error">{error}</p>}

          <button className="unified-auth-submit" disabled={busy}>
            {busy
              ? "Memproses…"
              : mode === "login"
                ? "Login"
                : mode === "setup"
                  ? "Buat admin"
                  : googleRegistration
                    ? "Selesaikan pendaftaran"
                    : "Buat akun"}
          </button>
        </form>

        {mode !== "setup" && !googleRegistration && (
          <>
            <div className="unified-auth-divider" aria-hidden="true">
              <span>atau</span>
            </div>
            <a
              className="unified-auth-google"
              href={`/api/auth/google/start?intent=${mode === "register" ? "register" : "login"}`}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.35 12.21c0-.72-.06-1.25-.2-1.8H12v3.3h5.37a4.6 4.6 0 0 1-1.99 2.93v2.14h3.22c1.88-1.73 2.75-4.28 2.75-6.57Z"
                />
                <path
                  fill="currentColor"
                  d="M12 21.7c2.7 0 4.96-.89 6.6-2.92l-3.22-2.14c-.89.6-2.03.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.09v2.21A9.97 9.97 0 0 0 12 21.7Z"
                  opacity=".78"
                />
                <path
                  fill="currentColor"
                  d="M6.41 13.48A6 6 0 0 1 6.1 11.6c0-.65.11-1.29.31-1.88V7.5H3.09A9.98 9.98 0 0 0 2 11.6c0 1.48.35 2.88 1.09 4.09l3.32-2.21Z"
                  opacity=".58"
                />
                <path
                  fill="currentColor"
                  d="M12 5.6c1.47 0 2.79.5 3.83 1.49l2.87-2.87C16.95 2.59 14.7 1.5 12 1.5A9.97 9.97 0 0 0 3.09 7.5l3.32 2.22C7.2 7.36 9.4 5.6 12 5.6Z"
                  opacity=".9"
                />
              </svg>
              {mode === "register"
                ? "Daftar dengan Google"
                : "Masuk dengan Google"}
            </a>
          </>
        )}

        {mode !== "setup" && (
          <button
            className="unified-auth-switch"
            type="button"
            onClick={() => {
              setError("");
              setGoogleRegistration(null);
              window.history.replaceState(null, "", window.location.pathname);
              setMode((value) => (value === "login" ? "register" : "login"));
            }}
          >
            {mode === "login"
              ? "Pengguna baru? Buat akun"
              : "Sudah punya akun? Login"}
          </button>
        )}

        <p className="unified-auth-note">
          Petugas dan admin menggunakan form login yang sama. Akun petugas
          dibuat oleh admin.
        </p>
      </section>
    </main>
  );
}
