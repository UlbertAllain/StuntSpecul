"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Activity, Baby, LoaderCircle, Ruler, Scale } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";

type StationActive = {
  status: "queued" | "running";
  cameraEnabled: boolean;
  createdAt: number;
};

type StationState = { active: StationActive | null };

export function StationDisplay() {
  const [state, setState] = useState<StationState | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const value = await api<StationState>("/station/active", {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setState(value);
          setError("");
        }
      } catch (e) {
        if (!controller.signal.aborted) setError(errorMessage(e));
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 2000);
    }

    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  const active = state?.active ?? null;

  return (
    <main className="min-h-svh bg-[var(--brand-ice)] px-5 py-8 text-[var(--ink)] sm:px-8">
      <div className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-[560px] flex-col">
        <header className="mb-6 flex items-center justify-center rounded-[1.75rem] bg-white px-6 py-4 shadow-sm">
          <Image
            src="/images/stuntspecula-logo.jpeg"
            alt="StuntSpecula"
            width={1536}
            height={1024}
            className="h-24 w-full max-w-[260px] object-contain"
            priority
          />
        </header>

        <section className="flex flex-1 flex-col justify-center rounded-[2rem] border border-[var(--border)] bg-white p-7 text-center shadow-xl sm:p-10">
          {error ? (
            <>
              <Activity className="mx-auto mb-5" size={48} />
              <h1 className="text-3xl font-black">
                Koneksi perangkat terganggu
              </h1>
              <p className="mt-4 leading-7 text-[var(--muted-foreground)]">
                {error}. Layar akan mencoba terhubung kembali secara otomatis.
              </p>
            </>
          ) : !state ? (
            <>
              <LoaderCircle className="mx-auto mb-5 animate-spin" size={48} />
              <h1 className="text-3xl font-black">Menyiapkan alat…</h1>
              <p className="mt-4 text-[var(--muted-foreground)]">
                Menghubungkan layar StuntSpecula dengan sistem fasilitas.
              </p>
            </>
          ) : !active ? (
            <>
              <span className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-[var(--brand-ice)]">
                <Baby size={42} />
              </span>
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[var(--blue)]">
                Alat siap digunakan
              </p>
              <h1 className="mx-auto mt-4 max-w-md text-4xl font-black tracking-tight sm:text-5xl">
                Menunggu pemeriksaan berikutnya
              </h1>
              <p className="mx-auto mt-5 max-w-md text-lg leading-8 text-[var(--muted-foreground)]">
                Petugas akan memilih profil anak dari dashboard Puskesmas.
                Setelah data diterima, layar ini akan berubah otomatis.
              </p>
            </>
          ) : (
            <>
              <span className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-[var(--brand-ice)]">
                {active.status === "running" ? (
                  <LoaderCircle className="animate-spin" size={42} />
                ) : (
                  <Activity size={42} />
                )}
              </span>
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[var(--blue)]">
                {active.status === "running"
                  ? "Pemeriksaan berlangsung"
                  : "Data pemeriksaan diterima"}
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                {active.status === "running"
                  ? "Tetap berdiri tegak, ya."
                  : "Silakan bersiap di atas alat."}
              </h1>
              <p className="mx-auto mt-5 max-w-md leading-7 text-[var(--muted-foreground)]">
                Profil anak telah dipilih oleh petugas. Data identitas tidak
                ditampilkan pada layar alat untuk menjaga privasi.
              </p>
              <div className="mx-auto mt-7 flex w-full max-w-sm flex-col gap-3 text-left">
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] p-4">
                  <Ruler size={22} />
                  <span>Pengukuran tinggi badan</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] p-4">
                  <Scale size={22} />
                  <span>Pengukuran berat badan</span>
                </div>
              </div>
              <p className="mx-auto mt-6 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">
                Analisis wajah digunakan untuk indikator visual seperti area
                mata dan kondisi bibir, bukan untuk mengenali identitas anak.
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
