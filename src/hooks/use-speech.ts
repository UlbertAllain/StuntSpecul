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

const STEP_SPEECH: Record<Step, string> = {
  welcome: "Halo! Aku Mimo. Yuk, berdiri bersamaku!",
  prepare: "Lepas alas kaki, lalu naik ke alat. Aku tunggu di sini.",
  height: "Berdiri tegak seperti aku. Kaki rapat, lihat lurus ke depan.",
  weight: "Sekarang kita main patung-patungan. Diam sebentar, ya.",
  camera: "Lihat ke tengah. Mata terbuka, bibir rileks. Tetap diam sebentar.",
  analysis: "Terima kasih, kamu sudah hebat. Sekarang boleh santai.",
  result: "Tos dulu, kamu hebat!",
};

function speakFallback(step: Step) {
  if (!("speechSynthesis" in window)) return;

  const utterance = new SpeechSynthesisUtterance(STEP_SPEECH[step]);
  utterance.lang = "id-ID";
  utterance.rate = 0.94;
  utterance.pitch = 1;

  const indonesianVoice = window.speechSynthesis
    .getVoices()
    .find((voice) => voice.lang.toLowerCase().startsWith("id"));
  if (indonesianVoice) utterance.voice = indonesianVoice;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function useSpeech(step: Step, enabled: boolean, paused: boolean) {
  useEffect(() => {
    if (!enabled || paused) return;

    const audio = new Audio(STEP_AUDIO[step]);
    let fallbackStarted = false;

    const fallback = () => {
      if (fallbackStarted) return;
      fallbackStarted = true;
      speakFallback(step);
    };

    audio.preload = "auto";
    audio.volume = 0.92;
    audio.addEventListener("error", fallback, { once: true });

    void audio.play().catch(fallback);

    return () => {
      audio.removeEventListener("error", fallback);
      audio.pause();
      audio.currentTime = 0;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [step, enabled, paused]);
}
