from __future__ import annotations

import json
import math
import os
import threading
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from typing import Any

cv2 = None
np = None
ort = None

MODEL_VERSION = "model-a-v2.1"
THRESHOLD = 0.40
BLUR_MIN = 45.0
BRIGHTNESS_MIN = 55.0
BRIGHTNESS_MAX = 205.0
MIN_NATIVE_FACE_SIDE = 56
MAX_IMAGE_BYTES = 5 * 1024 * 1024

MODEL_DIR = Path(os.getenv("MODEL_A_DIR", "models"))
YUNET_PATH = MODEL_DIR / "face_detection_yunet_2023mar.onnx"
CLASSIFIER_PATH = MODEL_DIR / "mobilenetv3_stunting_v2.onnx"

IMAGENET_MEAN_VALUES = [0.485, 0.456, 0.406]
IMAGENET_STD_VALUES = [0.229, 0.224, 0.225]

_detector: Any | None = None
_session: Any | None = None
_runtime_lock = threading.Lock()
_dependency_error: str | None = None


def _json(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("X-Content-Type-Options", "nosniff")
    handler.end_headers()
    handler.wfile.write(body)


def _load_dependencies() -> tuple[Any, Any, Any]:
    global cv2, np, ort, _dependency_error

    if cv2 is not None and np is not None and ort is not None:
        return cv2, np, ort

    try:
        import cv2 as cv2_module
        import numpy as numpy_module
        import onnxruntime as ort_module

        cv2 = cv2_module
        np = numpy_module
        ort = ort_module
        _dependency_error = None
        return cv2, np, ort
    except Exception as exc:
        _dependency_error = f"{type(exc).__name__}: {exc}"
        raise RuntimeError(_dependency_error) from exc


def _runtime_status() -> dict[str, Any]:
    files_ready = (
        YUNET_PATH.is_file()
        and CLASSIFIER_PATH.is_file()
        and (MODEL_DIR / "mobilenetv3_stunting_v2.onnx.data").is_file()
    )

    dependency_error = None
    dependencies_ready = False

    try:
        cv2_module, np_module, ort_module = _load_dependencies()
        dependencies_ready = True
        dependency_versions = {
            "opencv": getattr(cv2_module, "__version__", "unknown"),
            "numpy": getattr(np_module, "__version__", "unknown"),
            "onnxruntime": getattr(ort_module, "__version__", "unknown"),
        }
    except Exception as exc:
        dependency_error = str(exc)
        dependency_versions = {}

    return {
        "filesReady": files_ready,
        "dependenciesReady": dependencies_ready,
        "dependencyError": dependency_error,
        "dependencyVersions": dependency_versions,
        "ready": files_ready and dependencies_ready,
    }


def _runtime_ready() -> bool:
    return bool(_runtime_status()["ready"])


def _load_runtime() -> tuple[Any, Any]:
    global _detector, _session

    status = _runtime_status()

    if not status["filesReady"]:
        raise FileNotFoundError("Model A deployment files are missing.")

    if not status["dependenciesReady"]:
        raise RuntimeError(status["dependencyError"] or "Python dependencies are unavailable.")

    cv2_module, np_module, ort_module = _load_dependencies()

    with _runtime_lock:
        if _detector is None:
            _detector = cv2_module.FaceDetectorYN.create(
                str(YUNET_PATH),
                "",
                (320, 320),
                0.50,
                0.30,
                5000,
            )

        if _session is None:
            _session = ort_module.InferenceSession(
                str(CLASSIFIER_PATH),
                providers=["CPUExecutionProvider"],
            )

    return _detector, _session


def _box_iou(a: list[float], b: list[float]) -> float:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b

    ix1 = max(ax1, bx1)
    iy1 = max(ay1, by1)
    ix2 = min(ax2, bx2)
    iy2 = min(ay2, by2)

    iw = max(0.0, ix2 - ix1)
    ih = max(0.0, iy2 - iy1)
    inter = iw * ih

    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    union = area_a + area_b - inter

    return inter / union if union > 0 else 0.0


def _same_face(a: dict[str, Any], b: dict[str, Any]) -> bool:
    if _box_iou(a["box"], b["box"]) >= 0.20:
        return True

    ax1, ay1, ax2, ay2 = a["box"]
    bx1, by1, bx2, by2 = b["box"]

    acx = (ax1 + ax2) / 2.0
    acy = (ay1 + ay2) / 2.0
    bcx = (bx1 + bx2) / 2.0
    bcy = (by1 + by2) / 2.0

    aw, ah = ax2 - ax1, ay2 - ay1
    bw, bh = bx2 - bx1, by2 - by1

    distance = math.hypot(acx - bcx, acy - bcy)
    reference = max(1.0, min((aw + ah) / 2.0, (bw + bh) / 2.0))

    area_a = max(1.0, aw * ah)
    area_b = max(1.0, bw * bh)
    size_ratio = max(area_a, area_b) / min(area_a, area_b)

    return distance <= 0.35 * reference and size_ratio <= 2.5


def _detect_variant(
    image: np.ndarray,
    detector: Any,
    scale: float,
    pad_ratio: float,
    pass_name: str,
) -> list[dict[str, Any]]:
    original_h, original_w = image.shape[:2]
    pad_x = int(original_w * pad_ratio)
    pad_y = int(original_h * pad_ratio)

    if pad_ratio > 0:
        work = cv2.copyMakeBorder(
            image,
            pad_y,
            pad_y,
            pad_x,
            pad_x,
            cv2.BORDER_CONSTANT,
            value=(127, 127, 127),
        )
    else:
        work = image

    if scale != 1.0:
        work = cv2.resize(
            work,
            None,
            fx=scale,
            fy=scale,
            interpolation=cv2.INTER_LINEAR,
        )

    h, w = work.shape[:2]

    with _runtime_lock:
        detector.setInputSize((w, h))
        _, faces = detector.detect(work)

    if faces is None:
        return []

    detections: list[dict[str, Any]] = []

    for face in faces:
        x, y, fw, fh = [float(value) for value in face[:4]]
        score = float(face[-1])

        x = x / scale - pad_x
        y = y / scale - pad_y
        fw /= scale
        fh /= scale

        x1 = max(0.0, x)
        y1 = max(0.0, y)
        x2 = min(float(original_w), x + fw)
        y2 = min(float(original_h), y + fh)

        if (x2 - x1) < 24 or (y2 - y1) < 24:
            continue

        detections.append(
            {
                "box": [x1, y1, x2, y2],
                "score": score,
                "pass": pass_name,
            }
        )

    return detections


def _cluster(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    candidates = sorted(candidates, key=lambda item: item["score"], reverse=True)
    representatives: list[dict[str, Any]] = []

    for candidate in candidates:
        if any(_same_face(candidate, kept) for kept in representatives):
            continue
        representatives.append(candidate)

    return representatives


def _primary_score(face: dict[str, Any], width: int, height: int) -> float:
    x1, y1, x2, y2 = face["box"]
    face_area = max(1.0, (x2 - x1) * (y2 - y1))
    area_ratio = min(1.0, face_area / max(1.0, width * height))

    cx = (x1 + x2) / 2.0
    cy = (y1 + y2) / 2.0
    dx = abs(cx - width / 2.0) / max(1.0, width / 2.0)
    dy = abs(cy - height / 2.0) / max(1.0, height / 2.0)
    centrality = max(0.0, 1.0 - min(1.0, math.hypot(dx, dy) / math.sqrt(2)))

    return float(face["score"]) + 0.35 * centrality + 0.15 * math.sqrt(area_ratio)


def _detect_primary_face(image: np.ndarray, detector: Any) -> tuple[dict[str, Any] | None, str | None]:
    passes = [
        (1.0, 0.00, "original_1x"),
        (1.5, 0.00, "original_1.5x"),
        (2.0, 0.00, "original_2x"),
        (1.0, 0.20, "padded_1x"),
        (1.5, 0.20, "padded_1.5x"),
    ]

    candidates: list[dict[str, Any]] = []

    for scale, pad, name in passes:
        candidates.extend(_detect_variant(image, detector, scale, pad, name))

    faces = _cluster(candidates)

    if not faces:
        return None, "no_face"

    height, width = image.shape[:2]
    faces.sort(key=lambda face: _primary_score(face, width, height), reverse=True)
    primary = faces[0]

    x1, y1, x2, y2 = primary["box"]
    primary_area = max(1.0, (x2 - x1) * (y2 - y1))

    if len(faces) > 1:
        second = faces[1]
        sx1, sy1, sx2, sy2 = second["box"]
        second_area = max(1.0, (sx2 - sx1) * (sy2 - sy1))
        if second["score"] >= 0.65 and second_area >= primary_area * 0.60:
            return None, "multiple_faces"

    if (x2 - x1) < MIN_NATIVE_FACE_SIDE or (y2 - y1) < MIN_NATIVE_FACE_SIDE:
        return None, "face_too_small"

    return primary, None


def _crop_with_context(image: np.ndarray, face: dict[str, Any]) -> np.ndarray:
    height, width = image.shape[:2]
    x1, y1, x2, y2 = face["box"]
    fw = x2 - x1
    fh = y2 - y1

    mx = fw * 0.18
    my = fh * 0.22

    cx1 = max(0, int(x1 - mx))
    cy1 = max(0, int(y1 - my))
    cx2 = min(width, int(x2 + mx))
    cy2 = min(height, int(y2 + my))

    return image[cy1:cy2, cx1:cx2]


def _quality(face_crop: np.ndarray) -> tuple[dict[str, float], str | None]:
    gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
    standardized = cv2.resize(gray, (224, 224), interpolation=cv2.INTER_LINEAR)

    blur = float(cv2.Laplacian(standardized, cv2.CV_64F).var())
    brightness = float(standardized.mean())

    if blur < BLUR_MIN:
        return {"blurScore": blur, "brightness": brightness}, "blur"
    if brightness < BRIGHTNESS_MIN:
        return {"blurScore": blur, "brightness": brightness}, "too_dark"
    if brightness > BRIGHTNESS_MAX:
        return {"blurScore": blur, "brightness": brightness}, "too_bright"

    return {"blurScore": blur, "brightness": brightness}, None


def _preprocess(face_crop: np.ndarray) -> np.ndarray:
    height, width = face_crop.shape[:2]

    x1 = int(width * 0.12)
    y1 = int(height * 0.16)
    x2 = int(width * 0.88)
    y2 = int(height * 0.94)

    inner = face_crop[y1:y2, x1:x2]
    gray = cv2.cvtColor(inner, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, (224, 224), interpolation=cv2.INTER_LINEAR)

    mean = np.array(IMAGENET_MEAN_VALUES, dtype=np.float32)
    std = np.array(IMAGENET_STD_VALUES, dtype=np.float32)

    rgb = np.repeat(gray[:, :, None], 3, axis=2).astype(np.float32) / 255.0
    rgb = (rgb - mean) / std

    return np.transpose(rgb, (2, 0, 1))[None, ...].astype(np.float32)


def _sigmoid(value: float) -> float:
    if value >= 0:
        z = math.exp(-value)
        return 1.0 / (1.0 + z)

    z = math.exp(value)
    return z / (1.0 + z)


def _infer(image_bytes: bytes, age_months: int) -> dict[str, Any]:
    if age_months < 24 or age_months > 59:
        return {
            "status": "reject",
            "reason": "age_out_of_scope",
            "modelVersion": MODEL_VERSION,
        }

    encoded = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)

    if image is None or image.size == 0:
        return {
            "status": "reject",
            "reason": "invalid_image",
            "modelVersion": MODEL_VERSION,
        }

    detector, session = _load_runtime()
    primary, detection_error = _detect_primary_face(image, detector)

    if detection_error or primary is None:
        return {
            "status": "reject",
            "reason": detection_error or "no_face",
            "modelVersion": MODEL_VERSION,
        }

    crop = _crop_with_context(image, primary)

    if crop.size == 0:
        return {
            "status": "reject",
            "reason": "no_face",
            "modelVersion": MODEL_VERSION,
        }

    quality, quality_error = _quality(crop)

    if quality_error:
        return {
            "status": "reject",
            "reason": quality_error,
            "modelVersion": MODEL_VERSION,
            "quality": quality,
        }

    tensor = _preprocess(crop)
    input_name = session.get_inputs()[0].name
    output = session.run(None, {input_name: tensor})[0]
    logit = float(np.asarray(output).reshape(-1)[0])
    probability = _sigmoid(logit)

    return {
        "status": "ok",
        "classification": (
            "stunting_indication"
            if probability >= THRESHOLD
            else "non_stunting_indication"
        ),
        "probabilityStunting": probability,
        "threshold": THRESHOLD,
        "modelVersion": MODEL_VERSION,
        "quality": quality,
        "detector": {
            "confidence": float(primary["score"]),
            "pass": primary["pass"],
        },
    }


class handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        status = _runtime_status()
        _json(
            self,
            200,
            {
                "service": MODEL_VERSION,
                "ready": status["ready"],
                "filesReady": status["filesReady"],
                "dependenciesReady": status["dependenciesReady"],
                "dependencyError": status["dependencyError"],
                "dependencyVersions": status["dependencyVersions"],
                "modelDir": str(MODEL_DIR),
            },
        )

    def do_POST(self) -> None:
        content_type = self.headers.get("Content-Type", "")
        if not content_type.startswith("image/"):
            _json(self, 415, {"message": "Kirim foto JPEG/PNG sebagai request body."})
            return

        try:
            age_months = int(self.headers.get("X-Age-Months", ""))
        except ValueError:
            _json(self, 422, {"message": "Usia anak tidak valid."})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0

        if length <= 0 or length > MAX_IMAGE_BYTES:
            _json(self, 413, {"message": "Ukuran foto tidak valid atau terlalu besar."})
            return

        image_bytes = self.rfile.read(length)

        try:
            result = _infer(image_bytes, age_months)
        except FileNotFoundError:
            _json(
                self,
                503,
                {
                    "message": "Model A belum terpasang pada server.",
                    "code": "model_not_ready",
                },
            )
            return
        except RuntimeError as exc:
            _json(
                self,
                503,
                {
                    "message": "Runtime Model A belum siap.",
                    "code": "model_runtime_not_ready",
                    "detail": str(exc),
                },
            )
            return
        except Exception:
            _json(
                self,
                500,
                {
                    "message": "Analisis wajah gagal diproses. Silakan coba lagi.",
                    "code": "model_inference_failed",
                },
            )
            return

        _json(self, 200, result)

    def log_message(self, format: str, *args: Any) -> None:
        # Do not write request bodies or child images to logs.
        return
