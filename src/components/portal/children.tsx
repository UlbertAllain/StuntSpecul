"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserRound } from "lucide-react";
import type { ChildProfile } from "@/lib/portal";
import { ageInMonths } from "@/lib/portal";
import { api, errorMessage } from "@/lib/api-client";
import { formatAge } from "@/lib/screening";
import { Message } from "./shell";

export function ChildrenPanel() {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api<ChildProfile[]>("/children", { signal: controller.signal })
      .then(setChildren)
      .catch((cause) => {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      });
    return () => controller.abort();
  }, []);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return children;
    return children.filter(
      (child) =>
        child.name.toLowerCase().includes(query) ||
        child.code.toLowerCase().includes(query) ||
        child.guardian.toLowerCase().includes(query),
    );
  }, [children, search]);

  return (
    <>
      <div className="section-heading compact-section-heading">
        <div>
          <h2>Data anak</h2>
          <p className="portal-note">
            Informasi penting ditampilkan langsung tanpa membuka halaman detail.
          </p>
        </div>
      </div>

      {error && <Message error>{error}</Message>}

      <label className="simple-search">
        <Search size={18} />
        <input
          aria-label="Cari data anak"
          placeholder="Cari nama, kode, atau orang tua…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      {visible.length === 0 ? (
        <div className="portal-empty">
          <UserRound />
          <h3>Data anak tidak ditemukan</h3>
          <p>Ubah kata pencarian atau tunggu data anak terdaftar.</p>
        </div>
      ) : (
        <div className="flat-child-list">
          {visible.map((child) => {
            const months = ageInMonths(child.birthDate);
            const eligible = months >= 24 && months <= 59;
            return (
              <article className="flat-child-card" key={child.id}>
                <div className="flat-child-head">
                  <span className="flat-child-avatar">
                    {child.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <h3>{child.name}</h3>
                    <p>{child.code}</p>
                  </div>
                  <span
                    className={
                      eligible ? "simple-badge success" : "simple-badge muted"
                    }
                  >
                    {eligible ? "Siap diperiksa" : "Di luar usia alat"}
                  </span>
                </div>
                <dl className="flat-details-grid">
                  <div>
                    <dt>Usia</dt>
                    <dd>{formatAge(months)}</dd>
                  </div>
                  <div>
                    <dt>Jenis kelamin</dt>
                    <dd>{child.sex === "male" ? "Laki-laki" : "Perempuan"}</dd>
                  </div>
                  <div>
                    <dt>Orang tua / wali</dt>
                    <dd>{child.guardian}</dd>
                  </div>
                  <div>
                    <dt>Tanggal lahir</dt>
                    <dd>
                      {new Date(
                        `${child.birthDate}T00:00:00Z`,
                      ).toLocaleDateString("id-ID")}
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
