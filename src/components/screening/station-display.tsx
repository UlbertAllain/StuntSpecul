"use client";

import { useEffect, useState } from "react";
import type { ScreeningCompletion } from "@/hooks/use-screening-session";
import { api, errorMessage } from "@/lib/api-client";
import type { MirrorAssignment } from "@/lib/portal";
import { NutriMirror } from "./nutri-mirror";
import { StationCompleteScreen } from "./station-complete-screen";
import { StationIdleScreen } from "./station-idle-screen";

type StationActive = {
  status: "queued" | "running" | "completed";
  cameraEnabled: boolean;
  createdAt: number;
};

type StationState = {
  active: StationActive | null;
};

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
      } catch (cause) {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      }

      if (!controller.signal.aborted) timer = setTimeout(poll, 2000);
    }

    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [assignment]);

  useEffect(() => {
    if (!assignment) return;

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;

    async function watchFinalization() {
      try {
        const value = await api<StationState>("/station/active", {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        if (!value.active) {
          setAssignment(null);
          setState({ active: null });
          setError("");
          return;
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      }

      if (!controller.signal.aborted) {
        timer = setTimeout(watchFinalization, 2000);
      }
    }

    timer = setTimeout(watchFinalization, 2000);
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
    } catch (cause) {
      setError(errorMessage(cause));
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
    if (cancel) {
      await api("/station/cancel", {
        method: "POST",
        body: {},
      });
    }

    setAssignment(null);
    setState({ active: null });
    setError("");
  }

  if (assignment) {
    return (
      <NutriMirror
        key="station-running"
        assignment={assignment}
        canBegin
        onComplete={saveCompletion}
        onFinish={finish}
        awaitingStaffFinalize
      />
    );
  }

  if (state?.active?.status === "completed") {
    return <StationCompleteScreen />;
  }

  if (state?.active) {
    return (
      <NutriMirror
        key={`station-ready-${state.active.createdAt}`}
        canBegin={!busy && !error}
        onBegin={begin}
        waitingLabel="Petugas sudah memilih profil anak. Tekan Aku siap! untuk memulai pemeriksaan."
      />
    );
  }

  return <StationIdleScreen error={error} loading={!state} />;
}
