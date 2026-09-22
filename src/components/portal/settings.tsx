"use client";

import { useEffect, useState } from "react";
import { UserPlus, UsersRound } from "lucide-react";
import type { Staff } from "@/lib/portal";
import { api, errorMessage } from "@/lib/api-client";
import { Message } from "./shell";

export function SettingsPanel() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api<Staff[]>("/staff", { signal: controller.signal })
      .then((items) => setStaff(items.filter((item) => item.role === "staff")))
      .catch((cause) => {
        if (!controller.signal.aborted) setError(errorMessage(cause));
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
      setRevision((value) => value + 1);
      onSuccess?.();
      setNotice("Perubahan tersimpan.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="section-heading compact-section-heading">
        <div>
          <h2>Kelola petugas</h2>
          <p className="portal-note">
            Admin dapat menambah, mengaktifkan, atau menonaktifkan akun petugas.
          </p>
        </div>
      </div>

      {error && <Message error>{error}</Message>}
      {notice && <Message>{notice}</Message>}

      <div className="admin-staff-grid">
        <section className="ref-card">
          <div className="ref-card-title">
            <span>
              <UserPlus />
            </span>
            <div>
              <h3>Tambah petugas</h3>
              <p>Akun baru otomatis memiliki role petugas.</p>
            </div>
          </div>

          <form
            className="profile-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const formData = new FormData(form);
              void mutate(
                "/staff",
                "POST",
                {
                  name: formData.get("name"),
                  email: formData.get("email"),
                  password: formData.get("password"),
                  role: "staff",
                },
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
            <button className="portal-primary" disabled={busy}>
              Simpan petugas
            </button>
          </form>
        </section>

        <section className="ref-card">
          <div className="ref-card-title">
            <span>
              <UsersRound />
            </span>
            <div>
              <h3>Petugas terdaftar</h3>
              <p>{staff.length} akun petugas tercatat.</p>
            </div>
          </div>

          {staff.length === 0 ? (
            <div className="ref-empty">Belum ada akun petugas.</div>
          ) : (
            <div className="ref-staff-list">
              {staff.map((person) => (
                <div className="ref-staff-row" key={person.id}>
                  <span className="ref-staff-avatar">
                    {person.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <strong>{person.name}</strong>
                    <small>{person.email}</small>
                  </div>
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
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
