"use client";

import type { Step } from "./session";

const STEP_AUDIO: Record<Step, string> = {
  welcome: "/audio/mimo/mimo-hello.mp3",
  prepare: "/audio/mimo/mimo-ready.mp3",
  height: "/audio/mimo/mimo-height.mp3",
  weight: "/audio/mimo/mimo-weight.mp3",
  camera: "/audio/mimo/mimo-camera.mp3",
  analysis: "/audio/mimo/mimo-processing.mp3",
  result: "/audio/mimo/mimo-success.mp3",
};

const COUNTDOWN_AUDIO: Record<number, string> = {
  3: "/audio/mimo/countdown-3.mp3",
  2: "/audio/mimo/countdown-2.mp3",
  1: "/audio/mimo/countdown-1.mp3",
};

const STAGE_DONE_AUDIO = "/audio/mimo/mimo-stage-done.mp3";
const ALL_AUDIO = [
  ...Object.values(STEP_AUDIO),
  ...Object.values(COUNTDOWN_AUDIO),
  STAGE_DONE_AUDIO,
];

let currentStageAudio: HTMLAudioElement | null = null;
let preloaded = false;

function play(path: string, volume = 0.86) {
  if (typeof window === "undefined") return null;

  const audio = new Audio(path);
  audio.preload = "auto";
  audio.volume = volume;
  void audio.play().catch(() => {});
  return audio;
}

export function preloadMimoAudio() {
  if (typeof window === "undefined" || preloaded) return;
  preloaded = true;

  for (const path of new Set(ALL_AUDIO)) {
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = path;
    audio.load();
  }
}

export function stopMimoStageCue() {
  if (!currentStageAudio) return;
  currentStageAudio.pause();
  currentStageAudio.currentTime = 0;
  currentStageAudio = null;
}

export function playMimoStageCue(step: Step) {
  stopMimoStageCue();
  currentStageAudio = play(STEP_AUDIO[step], 0.9);
}

export function playMimoCountdownCue(remaining: number) {
  const path = COUNTDOWN_AUDIO[remaining];
  if (path) play(path, 0.82);
}

export function playMimoStageDoneCue() {
  play(STAGE_DONE_AUDIO, 0.84);
}
