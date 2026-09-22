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

export function UnifiedLogin() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState("");

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

      await api("/parent-account/register", {
        method: "POST",
        body: {
          name: String(form.get("name") || ""),
          email: String(form.get("email") || ""),
          password: String(form.get("password") || ""),
          child: {
            name: String(form.get("childName") || ""),
            birthDate: String(form.get("birthDate") || ""),
            sex: String(form.get("sex") || ""),
          },
        },
      });
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
                : "Buat akun orang tua"}
          </h1>
          <p>
            {mode === "login"
              ? "Masuk dengan satu akun. Sistem akan membuka halaman sesuai peran Anda."
              : mode === "setup"
                ? "Setup ini hanya muncul di localhost saat Firestore masih kosong."
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
                minLength={mode === "login" ? 1 : 12}
                maxLength={72}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={
                  showPassword ? "Sembunyikan password" : "Tampilkan password"
                }
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          {error && <p className="unified-auth-error">{error}</p>}

          <button className="unified-auth-submit" disabled={busy}>
            {busy
              ? "Memproses…"
              : mode === "login"
                ? "Login"
                : mode === "setup"
                  ? "Buat admin"
                  : "Buat akun"}
          </button>
        </form>

        {mode !== "setup" && (
          <button
            className="unified-auth-switch"
            type="button"
            onClick={() => {
              setError("");
              setMode((value) => (value === "login" ? "register" : "login"));
            }}
          >
            {mode === "login"
              ? "Orang tua baru? Buat akun"
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
