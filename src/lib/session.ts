import {
  childSchema,
  type Capture,
  type Child,
  type ScreeningReport,
} from "./screening.ts";

export type MeasurementPhase = "prepare" | "height" | "weight";
export type Step =
  | "welcome"
  | MeasurementPhase
  | "camera"
  | "analysis"
  | "result";

export const STEP_PROGRESS: Record<Step, number> = {
  welcome: 0,
  prepare: 0,
  height: 0,
  weight: 1,
  camera: 2,
  analysis: 3,
  result: 3,
};

export const STEP_INSTRUCTIONS: Record<Step, string> = {
  welcome: "Halo! Aku Mimo. Yuk, berdiri bersamaku!",
  prepare: "Lepas alas kaki, lalu naik ke alat. Aku tunggu di sini.",
  height: "Berdiri tegak seperti aku. Kaki rapat, lihat lurus ke depan.",
  weight: "Sekarang kita main patung-patungan. Diam sebentar, ya.",
  camera: "Lihat ke tengah. Mata terbuka, bibir rileks. Tetap diam sebentar.",
  analysis: "Terima kasih, kamu sudah hebat. Sekarang boleh santai.",
  result: "Tos dulu, kamu hebat!",
};

export type Session = {
  step: Step;
  child: Child | null;
  cameraEnabled: boolean;
  capture: Capture | null;
  report: ScreeningReport | null;
  paused: boolean;
  exitOpen: boolean;
};

export const INITIAL_SESSION: Session = {
  step: "welcome",
  child: null,
  cameraEnabled: true,
  capture: null,
  report: null,
  paused: false,
  exitOpen: false,
};

export type SessionAction =
  | { type: "start"; child: Child; cameraEnabled: boolean }
  | { type: "advance"; from: MeasurementPhase }
  | { type: "capture"; capture: Capture }
  | { type: "complete"; report: ScreeningReport }
  | { type: "toggle-pause" }
  | { type: "set-exit"; open: boolean }
  | { type: "reset" };

const NEXT_MEASUREMENT_STEP: Record<MeasurementPhase, Step> = {
  prepare: "height",
  height: "weight",
  weight: "camera",
};

export function sessionReducer(state: Session, action: SessionAction): Session {
  switch (action.type) {
    case "start": {
      if (state.step !== "welcome") return state;
      const child = childSchema.safeParse(action.child);
      if (!child.success) return state;
      return {
        ...INITIAL_SESSION,
        step: "prepare",
        child: child.data,
        cameraEnabled: action.cameraEnabled,
      };
    }
    case "advance":
      if (state.step !== action.from) return state;
      if (action.from === "weight" && !state.cameraEnabled) {
        return {
          ...state,
          step: "analysis",
          capture: { status: "skipped" },
          paused: false,
        };
      }
      return {
        ...state,
        step: NEXT_MEASUREMENT_STEP[action.from],
        paused: false,
      };
    case "capture":
      if (state.step !== "camera") return state;
      return {
        ...state,
        step: "analysis",
        capture: action.capture,
        paused: false,
      };
    case "complete":
      if (state.step !== "analysis") return state;
      // Release the photo as soon as report construction completes.
      return {
        ...state,
        step: "result",
        capture: null,
        report: action.report,
        paused: false,
      };
    case "toggle-pause":
      return { ...state, paused: !state.paused };
    case "set-exit":
      return { ...state, exitOpen: action.open };
    case "reset":
      return INITIAL_SESSION;
  }
}
