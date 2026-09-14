"use client";

import { useEffect } from "react";

export function useSpeech(text: string, enabled: boolean, paused: boolean) {
  useEffect(() => {
    if (!enabled || paused || !("speechSynthesis" in window)) return;

    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "id-ID";
    speech.rate = 0.9;
    speech.pitch = 1.1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(speech);

    return () => window.speechSynthesis.cancel();
  }, [text, enabled, paused]);
}
