"use client";

import { useEffect, useReducer, useState, useSyncExternalStore } from "react";
import {
  createScreeningReport,
  readMeasurements,
  type Readings,
  type VisualAnalysis,
} from "@/lib/screening";
import { api, errorMessage } from "@/lib/api-client";
import { uploadLatestFacePhoto } from "@/lib/cloudinary";
import type { GrowthRecommendations } from "@/lib/growth-recommendations";
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
  visualAnalysis: VisualAnalysis | null;
};

export function useScreeningSession(
  assignment?: MirrorAssignment,
  saveCompletion?: (
    payload: ScreeningCompletion,
  ) => Promise<GrowthRecommendations | void>,
) {
  const [session, dispatch] = useReducer(
    sessionReducer,
    assignment
      ? {
          ...INITIAL_SESSION,
          step: assignment.cameraEnabled ? "camera" : "prepare",
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
  const [savedRecommendations, setSavedRecommendations] =
    useState<GrowthRecommendations | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const hidden = useSyncExternalStore(
    subscribeVisibility,
    getHidden,
    getServerHidden,
  );
  const active = !["welcome", "result"].includes(session.step);

  useEffect(
    () => () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    },
    [photoPreviewUrl],
  );

  async function complete(readingsOverride?: Readings) {
    if (!session.child || !session.capture) return;
    const report = createScreeningReport(
      session.child,
      readingsOverride ?? readMeasurements(),
      session.capture,
    );
    if (session.capture.status === "captured") {
      setPhotoPreviewUrl(URL.createObjectURL(session.capture.photo));
    }

    const payload: ScreeningCompletion = {
      heightCm: report.readings.heightCm,
      weightKg: report.readings.weightKg,
      captureStatus: report.captureStatus,
      facialStatus: report.facialAnalysis.status,
      facialProbability: report.facialAnalysis.probability,
      facialReason: report.facialAnalysis.reason,
      facialModelVersion: report.facialAnalysis.modelVersion,
      visualAnalysis: report.visualAnalysis,
    };

    setSaving(true);
    setSaveError("");
    try {
      if (assignment) {
        if (saveCompletion) {
          const recommendations = await saveCompletion(payload);
          if (recommendations) setSavedRecommendations(recommendations);
        } else {
          const result = await api<{
            recommendations?: GrowthRecommendations;
          }>("/screening/mirror/complete", {
            method: "POST",
            body: payload,
          });
          if (result.recommendations) {
            setSavedRecommendations(result.recommendations);
          }
        }

        if (session.capture.status === "captured") {
          void uploadLatestFacePhoto(
            session.capture.photo,
            assignment.id,
          ).catch(() => null);
        }
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
    savedRecommendations,
    photoPreviewUrl,
  };
}
