"use client";
import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import type { Staff } from "@/lib/portal";
import { api, errorMessage } from "@/lib/api-client";
import { Message } from "./shell";

export function SettingsPanel({ user }: { user: Staff }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api<Staff[]>("/staff", { signal: controller.signal })
      .then(setStaff)
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      });
    return () => controller.abort();
  }, [revision]);
  async function mutate(
    path: string,
    method: string,
    body: unknown,
    onSuccess?: () => void,
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(path, { method, body });
      setRevision((v) => v + 1);
      onSuccess?.();
      setNotice("Perubahan tersimpan.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Kelola petugas</h2>
          <p className="portal-note">
            Petugas dapat memantau data anak dan riwayat pemeriksaan. Pengelola
            dapat mengatur akun petugas.
          </p>
        </div>
      </div>
      {error && <Message error>{error}</Message>}
      {notice && <Message>{notice}</Message>}
      <div className="staff-settings">
        <section className="portal-card">
          <h3>
            <UserPlus /> Tambah petugas
          </h3>
          <form
            className="profile-form"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              void mutate(
                "/staff",
                "POST",
                Object.fromEntries(new FormData(form)),
                () => form.reset(),
              );
            }}
          >
            <label>
              Nama
              <input name="name" required minLength={2} maxLength={80} />
            </label>
            <label>
              Email
              <input name="email" type="email" required maxLength={160} />
            </label>
            <label>
              Password awal
              <input
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={72}
                autoComplete="new-password"
              />
            </label>
            <label>
              Akses
              <select name="role" defaultValue="staff">
                <option value="staff">Petugas monitoring</option>
                <option value="admin">Pengelola</option>
              </select>
            </label>
            <button className="portal-primary" disabled={busy}>
              Simpan petugas
            </button>
          </form>
        </section>
      </div>
      <section className="portal-card">
        <h3>Petugas terdaftar</h3>
        {staff.map((person) => (
          <div className="settings-row" key={person.id}>
            <div>
              <strong>
                {person.name} {person.id === user.id && "(Anda)"}
              </strong>
              <small>
                {person.email} ·{" "}
                {person.role === "admin" ? "Pengelola" : "Petugas monitoring"} ·{" "}
                {person.active ? "Aktif" : "Nonaktif"}
              </small>
            </div>
            {person.id !== user.id && (
              <button
                className="portal-secondary"
                disabled={busy}
                onClick={() =>
                  mutate(`/staff/${person.id}`, "PATCH", {
                    active: !person.active,
                  })
                }
              >
                {person.active ? "Nonaktifkan" : "Aktifkan"}
              </button>
            )}
          </div>
        ))}
      </section>
    </>
  );
}
