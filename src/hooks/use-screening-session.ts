"use client";

import { useReducer, useState, useSyncExternalStore } from "react";
import { createScreeningReport, readMeasurements } from "@/lib/screening";
import { api, errorMessage } from "@/lib/api-client";
import type { MirrorAssignment } from "@/lib/portal";
import { INITIAL_SESSION, sessionReducer } from "@/lib/session";

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

const getHidden = () => document.hidden;
const getServerHidden = () => false;

export type ScreeningCompletion = {
  heightCm: number | null;
  weightKg: number | null;
  captureStatus: "captured" | "skipped" | "failed";
  facialStatus:
    | "stunting_indication"
    | "non_stunting_indication"
    | "rejected"
    | "unavailable";
  facialProbability: number | null;
  facialReason: string | null;
  facialModelVersion: string | null;
};

export function useScreeningSession(
  assignment?: MirrorAssignment,
  saveCompletion?: (payload: ScreeningCompletion) => Promise<void>,
) {
  const [session, dispatch] = useReducer(
    sessionReducer,
    assignment
      ? {
          ...INITIAL_SESSION,
          step: "prepare",
          child: {
            ageMonths: assignment.ageMonths,
            sex: assignment.sex,
            canStand: true,
          },
          cameraEnabled: !!assignment.cameraEnabled,
        }
      : INITIAL_SESSION,
  );
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const hidden = useSyncExternalStore(
    subscribeVisibility,
    getHidden,
    getServerHidden,
  );
  const active = !["welcome", "result"].includes(session.step);

  async function complete() {
    if (!session.child || !session.capture) return;
    const report = createScreeningReport(
      session.child,
      readMeasurements(),
      session.capture,
    );
    const payload: ScreeningCompletion = {
      heightCm: report.readings.heightCm,
      weightKg: report.readings.weightKg,
      captureStatus: report.captureStatus,
      facialStatus: report.facialAnalysis.status,
      facialProbability: report.facialAnalysis.probability,
      facialReason: report.facialAnalysis.reason,
      facialModelVersion: report.facialAnalysis.modelVersion,
    };

    setSaving(true);
    setSaveError("");
    try {
      if (assignment) {
        if (saveCompletion) await saveCompletion(payload);
        else
          await api("/screening/mirror/complete", {
            method: "POST",
            body: payload,
          });
      }
      dispatch({ type: "complete", report });
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return {
    session,
    dispatch,
    active,
    isPaused: session.paused || session.exitOpen || hidden,
    complete,
    saveError,
    saving,
  };
}
