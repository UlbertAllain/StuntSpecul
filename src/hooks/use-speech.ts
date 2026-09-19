"use client";

import { useEffect } from "react";
import type { Step } from "@/lib/session";

const STEP_AUDIO: Record<Step, string> = {
  welcome: "/audio/mimo/welcome.mp3",
  prepare: "/audio/mimo/prepare.mp3",
  height: "/audio/mimo/height.mp3",
  weight: "/audio/mimo/weight.mp3",
  camera: "/audio/mimo/camera.mp3",
  analysis: "/audio/mimo/analysis.mp3",
  result: "/audio/mimo/result.mp3",
};

export function useSpeech(step: Step, enabled: boolean, paused: boolean) {
  useEffect(() => {
    if (!enabled || paused) return;

    const audio = new Audio(STEP_AUDIO[step]);
    audio.preload = "auto";
    audio.volume = 0.92;

    void audio.play().catch(() => {
      // Browsers can block autoplay until the user interacts with the page.
      // The voice toggle itself provides that interaction in the normal flow.
    });

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [step, enabled, paused]);
}
