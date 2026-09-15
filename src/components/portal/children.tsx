"use client";

import { useEffect, useState } from "react";
import { History, Search, UserRound } from "lucide-react";
import type { ChildProfile } from "@/lib/portal";
import { ageInMonths } from "@/lib/portal";
import { api, errorMessage } from "@/lib/api-client";
import { formatAge } from "@/lib/screening";
import { ExaminationHistory } from "./history";
import { Message } from "./shell";

export function ChildrenPanel() {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api<ChildProfile[]>(`/children?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then(setChildren)
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      });
    return () => controller.abort();
  }, [query]);

  if (history)
    return (
      <ExaminationHistory childId={history} onBack={() => setHistory("")} />
    );

  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Data anak</h2>
          <p className="portal-note">
            Data dibuat dari formulir yang diisi orang tua saat memulai
            pemeriksaan.
          </p>
        </div>
      </div>

      {error && <Message error>{error}</Message>}

      <form
        className="search-form"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search);
        }}
      >
        <Search size={20} />
        <input
          aria-label="Cari anak"
          placeholder="Cari nama atau kode anak…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={80}
        />
        <button className="portal-secondary">Cari</button>
      </form>

      {children.length === 0 ? (
        <div className="portal-empty">
          <UserRound />
          <h3>{query ? "Data anak tidak ditemukan" : "Belum ada data anak"}</h3>
          <p>
            Data akan muncul otomatis setelah orang tua mengisi formulir
            pemeriksaan.
          </p>
        </div>
      ) : (
        <div className="child-list">
          {children.map((child) => (
            <article className="child-row" key={child.id}>
              <span className="child-avatar">
                {child.name.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <h3>{child.name}</h3>
                <p>
                  {child.code} · {formatAge(ageInMonths(child.birthDate))}
                </p>
                <small>
                  {child.sex === "male" ? "Laki-laki" : "Perempuan"}
                  {child.guardian ? ` · Pendamping: ${child.guardian}` : ""}
                </small>
              </div>
              <div className="portal-actions">
                <button
                  className="portal-secondary"
                  onClick={() => setHistory(child.id)}
                >
                  <History size={18} />
                  Lihat riwayat
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
