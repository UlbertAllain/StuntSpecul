"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Maximize,
  Pause,
  Play,
  Ruler,
  Scale,
  ScanFace,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useScreeningSession,
  type ScreeningCompletion,
} from "@/hooks/use-screening-session";
import { useSpeech } from "@/hooks/use-speech";
import { STEP_INSTRUCTIONS, STEP_PROGRESS, type Step } from "@/lib/session";
import { CameraStep } from "./camera-step";
import type { MirrorAssignment } from "@/lib/portal";
import { errorMessage } from "@/lib/api-client";
import { ExaminationStage } from "./examination-stage";
import { Mascot } from "./mascot";
import { ProcessingStage } from "./processing-stage";
import { Results } from "./results";

const STAGES = [
  { label: "Tinggi", icon: Ruler },
  { label: "Berat", icon: Scale },
  { label: "Wajah", icon: ScanFace },
];

function ProgressDock({ step, active }: { step: Step; active: boolean }) {
  const completed = STEP_PROGRESS[step];
  return (
    <footer className="stage-dock" aria-label="Urutan pemeriksaan">
      {STAGES.map((stage, index) => (
        <div
          key={stage.label}
          className={`${completed > index ? "complete" : ""} ${active && completed === index ? "current" : ""}`}
          aria-current={active && completed === index ? "step" : undefined}
        >
          <span className="dock-icon">
            {completed > index ? <Check size={22} /> : <stage.icon size={23} />}
          </span>
          <span>{stage.label}</span>
          {index < STAGES.length - 1 && <span className="dock-connector" />}
        </div>
      ))}
    </footer>
  );
}

export function NutriMirror({
  assignment,
  canBegin = false,
  onBegin,
  onComplete,
  onFinish,
  waitingLabel = "Petugas menyiapkan pemeriksaan.",
  awaitingStaffFinalize = false,
}: {
  assignment?: MirrorAssignment;
  canBegin?: boolean;
  onBegin?: () => void;
  onComplete?: (payload: ScreeningCompletion) => Promise<void>;
  onFinish?: (cancel: boolean) => Promise<void>;
  waitingLabel?: string;
  awaitingStaffFinalize?: boolean;
}) {
  const { session, dispatch, active, isPaused, complete, saveError, saving } =
    useScreeningSession(assignment, onComplete);
  const { step, report, paused, exitOpen } = session;
  const [voice, setVoice] = useState(false);
  const [notice, setNotice] = useState("");
  const stageRef = useRef<HTMLElement>(null);
  useSpeech(STEP_INSTRUCTIONS[step], voice, isPaused);

  useEffect(() => {
    stageRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step]);

  async function reset() {
    try {
      if (assignment && onFinish) await onFinish(step !== "result");
      else dispatch({ type: "reset" });
      setNotice("");
    } catch (error) {
      setNotice(errorMessage(error));
    }
  }

  function requestExit() {
    if (step !== "welcome" && !(awaitingStaffFinalize && step === "result"))
      dispatch({ type: "set-exit", open: true });
  }

  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setNotice("Gunakan pengaturan layar penuh pada browser ini.");
    }
  }

  function toggleVoice() {
    if (!("speechSynthesis" in window)) {
      setNotice("Browser ini belum mendukung panduan suara.");
      return;
    }
    setVoice((enabled) => !enabled);
  }

  function renderStage() {
    switch (step) {
      case "welcome":
        return (
          <section className="welcome-screen">
            <div className="screen-heading">
              <span className="hello-line">Halo, aku Mimo!</span>
              <h1>
                Berdiri. Diam.
                <br />
                <span>Tadaa!</span>
              </h1>
              <p>Yuk, ukur badan bareng aku.</p>
            </div>
            <div className="welcome-character">
              <span className="hello-sticker">
                Yuk,
                <br />
                berteman!
              </span>
              <Mascot interactive />
            </div>
            <button
              className="primary-button start-button"
              onClick={onBegin}
              disabled={!canBegin}
            >
              {canBegin ? "Aku siap!" : "Menunggu petugas"}
              <ArrowRight />
            </button>
            <p className="parent-caption">
              {canBegin
                ? "Ayah & Bunda, bantu si kecil naik ke alat, ya."
                : waitingLabel}
            </p>
          </section>
        );
      case "prepare":
      case "height":
      case "weight":
        return (
          <ExaminationStage
            key={step}
            phase={step}
            paused={isPaused}
            onComplete={() => dispatch({ type: "advance", from: step })}
          />
        );
      case "camera":
        return (
          <section className="face-screen">
            <div className="screen-heading">
              <span className="stage-kicker">
                <ScanFace size={18} />
                WAJAH
              </span>
              <h1>Lihat ke sini, yuk.</h1>
              <p>Mata terbuka. Bibir rileks.</p>
            </div>
            <CameraStep
              paused={isPaused}
              onComplete={(capture) => dispatch({ type: "capture", capture })}
            />
          </section>
        );
      case "analysis":
        return <ProcessingStage paused={isPaused} onComplete={complete} />;
      case "result":
        return (
          report && (
            <Results
              report={report}
              onFinish={awaitingStaffFinalize ? undefined : reset}
              awaitingStaffFinalize={awaitingStaffFinalize}
            />
          )
        );
    }
  }

  const resultLocked = awaitingStaffFinalize && step === "result";

  return (
    <div
      className={`mirror-shell screen-${step} ${isPaused ? "is-paused" : ""}`}
    >
      <header className="mirror-header">
        <button
          className="wordmark"
          onClick={requestExit}
          aria-label="StuntSpecula, kembali ke awal"
        >
          <Image
            src="/images/stuntspecula-logo.jpeg"
            alt="StuntSpecula"
            width={1536}
            height={1024}
            priority
          />
        </button>
        <div className="header-tools">
          <button
            className="icon-button"
            onClick={toggleVoice}
            aria-label={voice ? "Matikan suara" : "Aktifkan panduan suara"}
            aria-pressed={voice}
          >
            {voice ? <Volume2 /> : <VolumeX />}
          </button>
          <button
            className="icon-button fullscreen-button"
            onClick={fullscreen}
            aria-label="Layar penuh"
          >
            <Maximize />
          </button>
        </div>
      </header>
      <main
        ref={stageRef}
        tabIndex={-1}
        className="mirror-stage"
        data-step={step}
      >
        {step !== "welcome" && (
          <div className="stage-controls">
            {!resultLocked && (
              <button
                className="back-button"
                onClick={requestExit}
                aria-label="Kembali ke awal"
              >
                <ArrowLeft size={20} />
                <span>Kembali</span>
              </button>
            )}
            <span>
              {step === "result"
                ? "HASIL SCREENING"
                : "PEMERIKSAAN BERLANGSUNG"}
            </span>
            {active && (
              <button
                className="pause-button"
                onClick={() => dispatch({ type: "toggle-pause" })}
              >
                {paused ? <Play size={18} /> : <Pause size={18} />}
                <span>{paused ? "Lanjut" : "Jeda"}</span>
              </button>
            )}
          </div>
        )}
        <div key={step} className="stage-content">
          {renderStage()}
        </div>
        {saving && (
          <p className="parent-caption" role="status">
            Menyimpan hasil pemeriksaan…
          </p>
        )}
        {saveError && (
          <div className="field-error" role="alert">
            <p>{saveError}</p>
            <button
              className="text-button"
              disabled={saving}
              onClick={complete}
            >
              Coba simpan lagi
            </button>
          </div>
        )}
        {paused && active && (
          <p className="pause-notice" role="status">
            Kita jeda dulu. Tekan Lanjut kalau sudah siap.
          </p>
        )}
      </main>
      {step !== "result" && <ProgressDock step={step} active={active} />}
      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button
            aria-label="Tutup pemberitahuan"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      )}
      <AlertDialog
        open={exitOpen}
        onOpenChange={(open) => dispatch({ type: "set-exit", open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Akhiri pemeriksaan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Foto di perangkat akan dihapus. Hasil yang sudah tersimpan tetap
              tersedia untuk petugas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Lanjut pemeriksaan</AlertDialogCancel>
            <AlertDialogAction onClick={reset}>
              Kembali ke awal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
