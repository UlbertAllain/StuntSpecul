"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Activity, Baby, LoaderCircle } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import type { MirrorAssignment } from "@/lib/portal";
import type { ScreeningCompletion } from "@/hooks/use-screening-session";
import { NutriMirror } from "./nutri-mirror";

type StationActive = {
  status: "queued" | "running";
  cameraEnabled: boolean;
  createdAt: number;
};

type StationState = { active: StationActive | null };

export function StationDisplay() {
  const [state, setState] = useState<StationState | null>(null);
  const [assignment, setAssignment] = useState<MirrorAssignment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (assignment) return;
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
  }, [assignment]);

  async function begin() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const claimed = await api<MirrorAssignment>("/station/claim", {
        method: "POST",
        body: {},
      });
      setAssignment({ ...claimed, cameraEnabled: !!claimed.cameraEnabled });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveCompletion(payload: ScreeningCompletion) {
    await api("/station/complete", {
      method: "POST",
      body: payload,
    });
  }

  async function finish(cancel: boolean) {
    if (cancel)
      await api("/station/cancel", {
        method: "POST",
        body: {},
      });
    setAssignment(null);
    setState({ active: null });
    setError("");
  }

  if (assignment)
    return (
      <NutriMirror
        key="station-running"
        assignment={assignment}
        canBegin
        onComplete={saveCompletion}
        onFinish={finish}
      />
    );

  if (state?.active)
    return (
      <NutriMirror
        key={`station-ready-${state.active.createdAt}`}
        canBegin={!busy && !error}
        onBegin={begin}
        waitingLabel="Petugas sudah memilih profil anak. Tekan Aku siap! untuk memulai pemeriksaan."
      />
    );

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
          ) : (
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
                Setelah data diterima, layar pemeriksaan akan terbuka otomatis.
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
