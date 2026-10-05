"use client";

import { useEffect, useState } from "react";
import type { ScreeningCompletion } from "@/hooks/use-screening-session";
import { api, errorMessage } from "@/lib/api-client";
import type { GrowthRecommendations } from "@/lib/growth-recommendations";
import type { MirrorAssignment } from "@/lib/portal";
import { NutriMirror } from "./nutri-mirror";
import { StationCompleteScreen } from "./station-complete-screen";
import { StationIdleScreen } from "./station-idle-screen";

type StationActive = {
  examinationId: string;
  status: "queued" | "running" | "completed";
  cameraEnabled: boolean;
  createdAt: number;
  heightCm: number | null;
  weightKg: number | null;
  measurementUpdatedAt: number | null;
  measurementIssue: string | null;
  measurementIssueAt: number | null;
};

type StationState = {
  active: StationActive | null;
};

const IDLE_POLL_MS = 1_000;
const ACTIVE_POLL_MS = 700;

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
        if (controller.signal.aborted) return;

        setState(value);
        setError("");

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

      if (!controller.signal.aborted) timer = setTimeout(poll, IDLE_POLL_MS);
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

        if (
          !value.active ||
          value.active.examinationId !== assignment?.id
        ) {
          setAssignment(null);
          setError("");
          return;
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      }

      if (!controller.signal.aborted) {
        timer = setTimeout(watchFinalization, ACTIVE_POLL_MS);
      }
    }

    timer = setTimeout(watchFinalization, ACTIVE_POLL_MS);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [assignment]);

  async function saveCompletion(payload: ScreeningCompletion) {
    const result = await api<{
      saved: boolean;
      recommendations?: GrowthRecommendations;
    }>("/station/complete", {
      method: "POST",
      body: payload,
    });
    return result.recommendations;
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
    setError("");
  }

  if (assignment) {
    return (
      <NutriMirror
        key={assignment.id}
        assignment={assignment}
        canBegin
        onComplete={saveCompletion}
        onFinish={finish}
        hardwareMeasurements={
          state?.active
            ? {
                heightCm: state.active.heightCm,
                weightKg: state.active.weightKg,
              }
            : null
        }
        measurementIssue={state?.active?.measurementIssue ?? null}
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
