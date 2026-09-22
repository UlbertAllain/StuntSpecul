"use client";

import { useEffect, useRef } from "react";
import type { Step } from "@/lib/session";
import {
  playMimoStageCue,
  preloadMimoAudio,
  stopMimoStageCue,
} from "@/lib/mimo-audio";

export function useMimoAudio(step: Step, enabled: boolean, paused: boolean) {
  const playedStep = useRef<Step | null>(null);

  useEffect(() => {
    preloadMimoAudio();
    return () => stopMimoStageCue();
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopMimoStageCue();
      playedStep.current = null;
      return;
    }

    if (paused) {
      stopMimoStageCue();
      return;
    }

    if (playedStep.current === step) return;
    playedStep.current = step;
    playMimoStageCue(step);
  }, [step, enabled, paused]);

  function playCurrentFromGesture() {
    playedStep.current = step;
    playMimoStageCue(step);
  }

  return { playCurrentFromGesture };
}
