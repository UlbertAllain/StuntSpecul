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
  heightCm: number | null;
  weightKg: number | null;
  measurementUpdatedAt: number | null;
};

type StationState = {
  active: StationActive | null;
  device: {
    online: boolean;
    lastSeen: number | null;
    firmwareVersion: string | null;
    heightSensor: "ok" | "error" | "unknown";
    weightSensor: "ok" | "error" | "unknown";
  };
};

export function StationDisplay() {
  const [state, setState] = useState<StationState | null>(null);
  const [assignment, setAssignment] = useState<MirrorAssignment | null>(null);
  const [busy, setBusy] = useState(false);
  const [hardwareMode, setHardwareMode] = useState(false);
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
        if (controller.signal.aborted) return;

        setState(value);
        setError("");
        if (value.device.online) setHardwareMode(true);

        if (value.active && value.active.status !== "completed") {
          setBusy(true);
          const claimed = await api<MirrorAssignment>("/station/claim", {
            method: "POST",
            body: {},
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;

          setAssignment({
            ...claimed,
            cameraEnabled: !!claimed.cameraEnabled,
          });
          setBusy(false);
          return;
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setBusy(false);
          setError(errorMessage(cause));
        }
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

        setState(value);
        if (value.device.online) setHardwareMode(true);

        if (!value.active) {
          setAssignment(null);
          setHardwareMode(false);
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
    setState(null);
    setHardwareMode(false);
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
        hardwareMode={hardwareMode}
        hardwareMeasurements={
          state?.active
            ? {
                heightCm: state.active.heightCm,
                weightKg: state.active.weightKg,
              }
            : null
        }
        awaitingParentFinalize
      />
    );
  }

  if (state?.active?.status === "completed") {
    return <StationCompleteScreen />;
  }

  if (state?.active) {
    return <StationIdleScreen error={error} loading={busy || !assignment} />;
  }

  return <StationIdleScreen error={error} loading={!state} />;
}
