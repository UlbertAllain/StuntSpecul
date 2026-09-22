const CAPTURE_MAX_WIDTH = 960;
const CAPTURE_MAX_HEIGHT = 1280;
const CAPTURE_TARGET_BYTES = 1_500_000;
const CAPTURE_QUALITIES = [0.8, 0.7, 0.6] as const;

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

function fittedSize(width: number, height: number) {
  const scale = Math.min(
    1,
    CAPTURE_MAX_WIDTH / width,
    CAPTURE_MAX_HEIGHT / height,
  );

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function jpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Gambar kamera tidak dapat diambil."));
      },
      "image/jpeg",
      quality,
    );
  });
}

export async function captureFrame(video: HTMLVideoElement): Promise<Blob> {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    throw new Error("Gambar kamera belum siap. Silakan coba lagi.");
  }

  const size = fittedSize(video.videoWidth, video.videoHeight);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Gambar kamera tidak dapat diproses.");

  context.drawImage(video, 0, 0, size.width, size.height);

  let latest: Blob | null = null;
  for (const quality of CAPTURE_QUALITIES) {
    latest = await jpegBlob(canvas, quality);
    if (latest.size <= CAPTURE_TARGET_BYTES) return latest;
  }

  if (!latest) throw new Error("Gambar kamera tidak dapat diambil.");
  return latest;
}
