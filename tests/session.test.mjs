import assert from "node:assert/strict";
import test from "node:test";
import { INITIAL_SESSION, sessionReducer } from "../src/lib/session.ts";
import {
  createScreeningReport,
  readMeasurements,
} from "../src/lib/screening.ts";

const child = { ageMonths: 36, sex: "female", canStand: true };
const capture = {
  status: "captured",
  photo: new Blob(["private"]),
  facialAnalysis: {
    status: "non_stunting_indication",
    probability: 0.2,
    threshold: 0.4,
    reason: null,
    modelVersion: "model-a-v2.1",
  },
};

function start(cameraEnabled = true) {
  return sessionReducer(INITIAL_SESSION, {
    type: "start",
    child,
    cameraEnabled,
  });
}

function measured(cameraEnabled = true) {
  let session = start(cameraEnabled);
  for (const from of ["prepare", "height", "weight"]) {
    session = sessionReducer(session, { type: "advance", from });
  }
  return session;
}

test("only the current measurement stage may advance the session", () => {
  const initial = start();
  assert.equal(initial.step, "prepare");
  assert.equal(
    sessionReducer(initial, { type: "advance", from: "weight" }),
    initial,
  );
  let session = initial;
  for (const [from, next] of [
    ["prepare", "height"],
    ["height", "weight"],
    ["weight", "camera"],
  ]) {
    session = sessionReducer(session, { type: "advance", from });
    assert.equal(session.step, next);
  }
});

test("disabling the camera skips capture without fabricating a face result", () => {
  const session = measured(false);
  assert.equal(session.step, "analysis");
  assert.deepEqual(session.capture, { status: "skipped" });
});

test("completion releases the photo and reset removes all session data", () => {
  let session = sessionReducer(measured(), { type: "capture", capture });
  assert.equal(session.capture.photo, capture.photo);
  const report = createScreeningReport(child, readMeasurements(), capture);
  session = sessionReducer(session, { type: "complete", report });
  assert.equal(session.step, "result");
  assert.equal(session.capture, null);
  assert.equal(session.report, report);
  assert.deepEqual(sessionReducer(session, { type: "reset" }), INITIAL_SESSION);
});

test("late capture or completion callbacks cannot revive an ended session", () => {
  const report = createScreeningReport(child, readMeasurements(), capture);
  assert.equal(
    sessionReducer(INITIAL_SESSION, { type: "capture", capture }),
    INITIAL_SESSION,
  );
  assert.equal(
    sessionReducer(INITIAL_SESSION, { type: "complete", report }),
    INITIAL_SESSION,
  );
});

test("opening and canceling the exit dialog preserve an existing pause", () => {
  let session = sessionReducer(start(), { type: "toggle-pause" });
  session = sessionReducer(session, { type: "set-exit", open: true });
  session = sessionReducer(session, { type: "set-exit", open: false });
  assert.equal(session.paused, true);
  assert.equal(session.step, "prepare");
});
