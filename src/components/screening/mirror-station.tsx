"use client";
import { useEffect, useState } from "react";
import type { MirrorAssignment } from "@/lib/portal";
import { api, ClientError, errorMessage } from "@/lib/api-client";
import { NutriMirror } from "./nutri-mirror";

export function MirrorStation() {
  const [pending, setPending] = useState<MirrorAssignment | null>(null);
  const [active, setActive] = useState<MirrorAssignment | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const result = await api<{ assignment: MirrorAssignment | null }>(
          "/mirror/assignment",
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setSignedIn(true);
        setPending(result.assignment);
        setError("");
      } catch (e) {
        if (controller.signal.aborted) return;
        if (e instanceof ClientError && e.status === 401) {
          setSignedIn(false);
          setPending(null);
        } else {
          setPending(null);
          setError(errorMessage(e));
        }
      }
      if (!controller.signal.aborted) timer = setTimeout(load, 5000);
    }
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [revision]);
  async function begin() {
    if (!pending || busy) return;
    setBusy(true);
    setError("");
    try {
      const assignment = await api<MirrorAssignment>(
        `/mirror/examinations/${pending.id}/claim`,
        { method: "POST", body: {} },
      );
      setActive({ ...assignment, cameraEnabled: !!assignment.cameraEnabled });
    } catch (e) {
      setError(errorMessage(e));
      setRevision((v) => v + 1);
    } finally {
      setBusy(false);
    }
  }
  async function finish(cancel: boolean) {
    if (active && cancel)
      await api(`/mirror/examinations/${active.id}/cancel`, {
        method: "POST",
        body: {},
      });
    setActive(null);
    setPending(null);
    setRevision((v) => v + 1);
  }
  return (
    <>
      <NutriMirror
        key={active?.id || "waiting"}
        assignment={active || undefined}
        canBegin={!!pending && !busy && !error}
        onBegin={begin}
        onFinish={finish}
        waitingLabel={
          error ||
          (signedIn
            ? "Pilih anak melalui Ruang petugas untuk memulai."
            : "Petugas, masuk terlebih dahulu untuk memulai pemeriksaan.")
        }
      />
      {!active && (
        <nav className="mirror-staff-links" aria-label="Akses petugas">
          <a href="/petugas">Ruang petugas</a>
        </nav>
      )}
    </>
  );
}
