import assert from "node:assert/strict";
import test from "node:test";
import { requestCamera, stopCamera } from "../src/lib/camera.ts";

function cameraStream() {
  let stopped = 0;
  return {
    stream: {
      getTracks: () => [
        {
          stop: () => {
            stopped += 1;
          },
        },
      ],
    },
    stopCount: () => stopped,
  };
}

test("a late permission grant releases the stream after cancellation", async () => {
  const controller = new AbortController();
  let grant;
  const permission = new Promise((resolve) => {
    grant = resolve;
  });
  const camera = cameraStream();
  const requested = requestCamera(controller.signal, () => permission);
  controller.abort();
  await assert.rejects(requested, { name: "AbortError" });
  grant(camera.stream);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(camera.stopCount(), 1);
});

test("an already canceled session never asks for camera permission", async () => {
  const controller = new AbortController();
  controller.abort();
  let requested = false;
  await assert.rejects(
    requestCamera(controller.signal, () => {
      requested = true;
      return Promise.resolve(cameraStream().stream);
    }),
    { name: "AbortError" },
  );
  assert.equal(requested, false);
});

test("permission failures propagate for recovery and successful streams can be released", async () => {
  const controller = new AbortController();
  await assert.rejects(
    requestCamera(controller.signal, () => {
      throw new Error("permission denied");
    }),
    /permission denied/,
  );
  const camera = cameraStream();
  const stream = await requestCamera(controller.signal, () =>
    Promise.resolve(camera.stream),
  );
  assert.equal(stream, camera.stream);
  stopCamera(stream);
  assert.equal(camera.stopCount(), 1);
});
