export function stopCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

/** getUserMedia cannot be canceled, so a late permission grant must release its stream. */
export async function requestCamera(
  signal: AbortSignal,
  request: () => Promise<MediaStream>,
): Promise<MediaStream> {
  if (signal.aborted)
    throw new DOMException("Camera request canceled", "AbortError");

  let onAbort = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () =>
      reject(new DOMException("Camera request canceled", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
  });
  const pending = Promise.resolve()
    .then(request)
    .then((stream) => {
      if (signal.aborted) {
        stopCamera(stream);
        throw new DOMException("Camera request canceled", "AbortError");
      }
      return stream;
    });

  try {
    return await Promise.race([pending, aborted]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

export async function captureFrame(video: HTMLVideoElement): Promise<Blob> {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    throw new Error("Gambar kamera belum siap. Silakan coba lagi.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Gambar kamera tidak dapat diproses.");
  context.drawImage(video, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Gambar kamera tidak dapat diambil."));
      },
      "image/jpeg",
      0.85,
    );
  });
}
