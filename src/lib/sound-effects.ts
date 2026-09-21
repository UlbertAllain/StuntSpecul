"use client";

let audioContext: AudioContext | null = null;

function context() {
  if (typeof window === "undefined") return null;
  audioContext ??= new AudioContext();
  return audioContext;
}

export function primeSoundEffects() {
  const current = context();
  if (current?.state === "suspended") void current.resume();
}

function tone(
  frequency: number,
  start: number,
  duration: number,
  volume: number,
) {
  const current = context();
  if (!current || current.state !== "running") return;

  const oscillator = current.createOscillator();
  const gain = current.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(current.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function playSoundEnabledCue() {
  primeSoundEffects();
  const current = context();
  if (!current) return;
  const now = current.currentTime + 0.02;
  tone(520, now, 0.09, 0.08);
  tone(660, now + 0.1, 0.1, 0.07);
}

export function playCountdownTone(remaining: number) {
  const current = context();
  if (!current || current.state !== "running") return;

  const frequencies: Record<number, number> = {
    3: 440,
    2: 520,
    1: 660,
  };
  const frequency = frequencies[remaining];
  if (!frequency) return;

  tone(frequency, current.currentTime + 0.01, 0.08, 0.055);
}

export function playResultCue() {
  const current = context();
  if (!current || current.state !== "running") return;

  const now = current.currentTime + 0.02;
  tone(523.25, now, 0.12, 0.06);
  tone(659.25, now + 0.13, 0.12, 0.06);
  tone(783.99, now + 0.26, 0.16, 0.065);
}
