"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  BookOpen,
  Home,
  LogOut,
  Play,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { api, ClientError, errorMessage } from "@/lib/api-client";
import type { ChatMessage, Examination, ParentAccountView } from "@/lib/portal";
import { ageInMonths } from "@/lib/portal";
import { formatAge } from "@/lib/screening";
import { Message, PortalShell } from "../shared/shell";
import { ParentAssistant } from "./assistant";
import { ParentBlog, prefetchParentBlogs } from "./blog";
import { ParentHome } from "./home";
import { ParentInsights } from "./insights";
import { ParentProfile } from "./profile";

type Tab = "home" | "insights" | "blog" | "profile";

const ASSISTANT_FAB_POSITION_KEY = "stuntspecula:assistant-fab-position-v2";
const ASSISTANT_FAB_MARGIN = 8;

type AssistantFabPosition = {
  left: number;
  top: number;
};

type AssistantFabDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  left: number;
  top: number;
  width: number;
  height: number;
  moved: boolean;
  bodyOverflow: string;
  bodyTouchAction: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function completed(exams: Examination[]) {
  return exams.filter((exam) => exam.status === "completed");
}

export function ParentPortal() {
  const router = useRouter();
  const [view, setView] = useState<ParentAccountView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stationControlBusy, setStationControlBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("home");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [consent, setConsent] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantFabPosition, setAssistantFabPosition] =
    useState<AssistantFabPosition | null>(null);
  const [examSheetOpen, setExamSheetOpen] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [examInputMode, setExamInputMode] = useState<"device" | "manual">(
    "device",
  );
  const [manualLinearCm, setManualLinearCm] = useState("");
  const [manualWeightKg, setManualWeightKg] = useState("");
  const [manualExtremeWarning, setManualExtremeWarning] = useState("");
  const assistantFabRef = useRef<HTMLButtonElement>(null);
  const assistantFabDragRef = useRef<AssistantFabDrag | null>(null);
  const suppressAssistantClickRef = useRef(false);

  useEffect(() => {
    function clampStoredPosition(position: AssistantFabPosition) {
      const button = assistantFabRef.current;
      const width = button?.offsetWidth ?? 112;
      const height = button?.offsetHeight ?? 52;

      return {
        left: clamp(
          position.left,
          ASSISTANT_FAB_MARGIN,
          window.innerWidth - width - ASSISTANT_FAB_MARGIN,
        ),
        top: clamp(
          position.top,
          ASSISTANT_FAB_MARGIN,
          window.innerHeight - height - ASSISTANT_FAB_MARGIN,
        ),
      };
    }

    try {
      const stored = sessionStorage.getItem(ASSISTANT_FAB_POSITION_KEY);
      if (stored) {
        const position = JSON.parse(stored) as AssistantFabPosition;
        if (Number.isFinite(position.left) && Number.isFinite(position.top)) {
          setAssistantFabPosition(clampStoredPosition(position));
        }
      }
    } catch {}

    const handleResize = () => {
      setAssistantFabPosition((position) =>
        position ? clampStoredPosition(position) : null,
      );
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const drag = assistantFabDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      event.preventDefault();
      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;

      if (Math.hypot(deltaX, deltaY) > 4) drag.moved = true;

      setAssistantFabPosition({
        left: clamp(
          drag.left + deltaX,
          ASSISTANT_FAB_MARGIN,
          window.innerWidth - drag.width - ASSISTANT_FAB_MARGIN,
        ),
        top: clamp(
          drag.top + deltaY,
          ASSISTANT_FAB_MARGIN,
          window.innerHeight - drag.height - ASSISTANT_FAB_MARGIN,
        ),
      });
    }

    function finishDrag(event: PointerEvent) {
      const drag = assistantFabDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      event.preventDefault();
      assistantFabDragRef.current = null;
      document.body.style.overflow = drag.bodyOverflow;
      document.body.style.touchAction = drag.bodyTouchAction;

      if (!drag.moved) return;

      suppressAssistantClickRef.current = true;
      setAssistantFabPosition((position) => {
        if (position) {
          try {
            sessionStorage.setItem(
              ASSISTANT_FAB_POSITION_KEY,
              JSON.stringify(position),
            );
          } catch {}
        }
        return position;
      });

      window.setTimeout(() => {
        suppressAssistantClickRef.current = false;
      }, 250);
    }

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", finishDrag, { passive: false });
    window.addEventListener("pointercancel", finishDrag, { passive: false });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);

      const drag = assistantFabDragRef.current;
      if (drag) {
        document.body.style.overflow = drag.bodyOverflow;
        document.body.style.touchAction = drag.bodyTouchAction;
      }
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    api<ParentAccountView>("/parent-account/me", { signal: controller.signal })
      .then((value) => {
        setView(value);
        const firstChild = value.children[0];
        if (firstChild) {
          setSelectedChildId(firstChild.id);
          setExamInputMode(
            ageInMonths(firstChild.birthDate) <= 23 ? "manual" : "device",
          );
          const latest = completed(value.examinations).find(
            (exam) => exam.childId === firstChild.id,
          );
          if (latest) setSelectedExamId(latest.id);
        }
        prefetchParentBlogs();
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        if (e instanceof ClientError && e.status === 401) {
          router.replace("/login");
          return;
        }
        setError(errorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [router]);

  const selectedChild =
    view?.children.find((child) => child.id === selectedChildId) ||
    view?.children[0] ||
    null;
  const selectedChildAgeMonths = selectedChild
    ? ageInMonths(selectedChild.birthDate)
    : null;
  const selectedChildIsInfant =
    selectedChildAgeMonths !== null && selectedChildAgeMonths <= 23;
  const selectedChildCanUseDevice =
    selectedChildAgeMonths !== null &&
    selectedChildAgeMonths >= 24 &&
    selectedChildAgeMonths <= 59;
  const selectedChildInScope =
    selectedChildAgeMonths !== null &&
    selectedChildAgeMonths >= 0 &&
    selectedChildAgeMonths <= 59;
  const manualLinearLabel = selectedChildIsInfant
    ? "Panjang badan (PB)"
    : "Tinggi badan (TB)";

  function selectChild(childId: string) {
    setSelectedChildId(childId);

    const child = view?.children.find((item) => item.id === childId);
    if (child) {
      setExamInputMode(
        ageInMonths(child.birthDate) <= 23 ? "manual" : "device",
      );
    }

    setManualLinearCm("");
    setManualWeightKg("");
    setManualExtremeWarning("");
    setError("");
  }

  const completedExams = useMemo(
    () =>
      completed(view?.examinations || []).filter(
        (exam) => !selectedChildId || exam.childId === selectedChildId,
      ),
    [selectedChildId, view?.examinations],
  );
  const latest = completedExams[0] || null;
  const selectedExam =
    completedExams.find((exam) => exam.id === selectedExamId) || latest;
  const selectedExamForChatId = selectedExam?.id || "";
  const activeExam =
    view?.examinations.find(
      (exam) =>
        exam.status === "queued" ||
        exam.status === "running" ||
        (exam.status === "completed" && !exam.finalizedAt),
    ) || null;
  const activeExamId = activeExam?.id || "";
  const activeExamStatus = activeExam?.status || "";

  useEffect(() => {
    if (!activeExamId || activeExamStatus === "completed") return;

    const controller = new AbortController();
    const timer = setInterval(() => {
      api<ParentAccountView>("/parent-account/me", {
        signal: controller.signal,
      })
        .then(setView)
        .catch(() => {});
    }, 1200);

    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [activeExamId, activeExamStatus]);

  useEffect(() => {
    if (!assistantOpen || !selectedExamForChatId) return;
    const controller = new AbortController();
    api<ChatMessage[]>(
      `/parent-account/messages?examId=${encodeURIComponent(selectedExamForChatId)}`,
      { signal: controller.signal },
    )
      .then(setMessages)
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      });
    return () => controller.abort();
  }, [assistantOpen, selectedExamForChatId]);

  async function refresh() {
    setView(await api<ParentAccountView>("/parent-account/me"));
  }

  async function logout() {
    try {
      await api("/parent-account/logout", { method: "POST", body: {} });
    } finally {
      router.replace("/login");
    }
  }

  async function startExamination() {
    if (!selectedChildId || busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/parent-account/examinations", {
        method: "POST",
        body: {
          childId: selectedChildId,
          cameraEnabled: true,
          canStand: true,
        },
      });
      await refresh();
      setExamSheetOpen(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveManualExamination(confirmExtreme = false) {
    if (!selectedChildId || !selectedChildInScope || busy) return;

    const linearCm = Number(manualLinearCm);
    const weightKg = Number(manualWeightKg);
    if (
      !Number.isFinite(linearCm) ||
      !Number.isFinite(weightKg) ||
      linearCm <= 0 ||
      weightKg <= 0
    ) {
      setError(
        `Isi ${manualLinearLabel.toLowerCase()} dan berat badan dengan angka yang valid.`,
      );
      return;
    }

    setBusy(true);
    setError("");
    try {
      const saved = await api<Examination>(
        "/parent-account/examinations/manual",
        {
          method: "POST",
          body: {
            childId: selectedChildId,
            linearCm,
            weightKg,
            confirmExtreme,
          },
        },
      );
      setSelectedExamId(saved.id);
      setManualLinearCm("");
      setManualWeightKg("");
      setManualExtremeWarning("");
      await refresh();
      setExamSheetOpen(false);
    } catch (e) {
      if (
        e instanceof ClientError &&
        e.code === "measurement_recheck_required"
      ) {
        setManualExtremeWarning(e.message);
        setError("");
      } else {
        setError(errorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  }

  async function finishExamination() {
    if (!activeExam || busy) return;
    setBusy(true);
    setError("");
    try {
      await api(`/parent-account/examinations/${activeExam.id}/finalize`, {
        method: "POST",
        body: {},
      });
      await refresh();
      setExamSheetOpen(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function sendStationControl(action: "retry_camera" | "skip_camera") {
    if (!activeExam || stationControlBusy) return;

    setStationControlBusy(true);
    setError("");
    try {
      await api(`/parent-account/examinations/${activeExam.id}/control`, {
        method: "POST",
        body: { action },
      });
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setStationControlBusy(false);
    }
  }

  async function cancelExamination() {
    if (!activeExam || busy) return;
    setBusy(true);
    setError("");
    try {
      await api(`/parent-account/examinations/${activeExam.id}/cancel`, {
        method: "POST",
        body: {},
      });
      await refresh();
      setExamSheetOpen(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function send(text: string) {
    if (!selectedExam || !text.trim() || busy || !consent) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ user: ChatMessage; assistant: ChatMessage }>(
        "/parent-account/chat",
        {
          method: "POST",
          body: { examId: selectedExam.id, message: text, consent: true },
        },
      );
      setMessages((old) => [...old, result.user, result.assistant]);
      setQuestion("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function beginAssistantDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();

    suppressAssistantClickRef.current = false;
    assistantFabDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
      bodyOverflow: document.body.style.overflow,
      bodyTouchAction: document.body.style.touchAction,
    };

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
  }

  const assistantFabStyle: CSSProperties | undefined = assistantFabPosition
    ? {
        left: assistantFabPosition.left,
        top: assistantFabPosition.top,
        right: "auto",
        bottom: "auto",
      }
    : undefined;

  if (loading)
    return (
      <PortalShell
        tone="parent"
        heading="StuntSpecula untuk Orang Tua"
        subtitle="Menyiapkan data pertumbuhan anak Anda."
      >
        <Message>Memeriksa sesi…</Message>
      </PortalShell>
    );

  if (!view)
    return (
      <PortalShell tone="parent" heading="Mengalihkan ke login">
        <Message>Sebentar…</Message>
      </PortalShell>
    );

  return (
    <PortalShell
      tone="parent"
      heading={`Halo, ${view.parent.name}`}
      subtitle="Pantau pertumbuhan anak dan pahami hasil pemeriksaan dari satu tempat."
      actions={
        <button className="portal-text" onClick={logout}>
          <LogOut size={18} /> Keluar
        </button>
      }
    >
      <nav
        className="portal-nav parent-desktop-nav"
        aria-label="Menu orang tua"
      >
        <button
          aria-current={tab === "home" ? "page" : undefined}
          onClick={() => setTab("home")}
        >
          <Home /> Beranda
        </button>
        <button
          aria-current={tab === "insights" ? "page" : undefined}
          onClick={() => setTab("insights")}
        >
          <TrendingUp /> Insight
        </button>
        <button
          className="parent-desktop-start"
          onClick={() => setExamSheetOpen(true)}
        >
          <Play /> Mulai pemeriksaan
        </button>
        <button
          aria-current={tab === "blog" ? "page" : undefined}
          onClick={() => setTab("blog")}
        >
          <BookOpen /> Activity
        </button>
        <button
          aria-current={tab === "profile" ? "page" : undefined}
          onClick={() => setTab("profile")}
        >
          <UserRound /> Profil
        </button>
      </nav>

      {error && <Message error>{error}</Message>}
      <div className="portal-content parent-portal-content">
        {tab === "home" && (
          <ParentHome
            view={view}
            child={selectedChild}
            examinations={completedExams}
            latest={latest}
            activeExam={activeExam}
            onSelectChild={selectChild}
            onStart={() => setExamSheetOpen(true)}
          />
        )}
        {tab === "insights" && (
          <ParentInsights examinations={completedExams} child={selectedChild} />
        )}
        {tab === "blog" && <ParentBlog />}
        {tab === "profile" && <ParentProfile view={view} onRefresh={refresh} />}
      </div>

      <button
        ref={assistantFabRef}
        className="parent-ai-fab"
        style={assistantFabStyle}
        onPointerDown={beginAssistantDrag}
        onClick={() => {
          if (suppressAssistantClickRef.current) return;
          setAssistantOpen(true);
        }}
        aria-label="Buka Asisten Pertumbuhan. Tekan untuk membuka, geser untuk memindahkan."
        title="Asisten Pertumbuhan"
      >
        <Image
          src="/images/mimo-cheer.png"
          alt=""
          width={96}
          height={96}
          className="parent-ai-fab-avatar"
          draggable={false}
        />
      </button>

      <nav className="parent-mobile-nav" aria-label="Navigasi orang tua">
        <button
          aria-current={tab === "home" ? "page" : undefined}
          onClick={() => setTab("home")}
        >
          <Home />
          <span>Beranda</span>
        </button>
        <button
          aria-current={tab === "insights" ? "page" : undefined}
          onClick={() => setTab("insights")}
        >
          <TrendingUp />
          <span>Insight</span>
        </button>
        <button
          className="parent-mobile-start"
          data-active={activeExam ? "true" : "false"}
          onClick={() => setExamSheetOpen(true)}
        >
          <span>
            <Play />
          </span>
          <small>
            {activeExam?.status === "completed"
              ? "Selesai"
              : activeExam
                ? "Aktif"
                : "Mulai"}
          </small>
        </button>
        <button
          aria-current={tab === "blog" ? "page" : undefined}
          onClick={() => setTab("blog")}
        >
          <BookOpen />
          <span>Activity</span>
        </button>
        <button
          aria-current={tab === "profile" ? "page" : undefined}
          onClick={() => setTab("profile")}
        >
          <UserRound />
          <span>Profil</span>
        </button>
      </nav>

      {examSheetOpen && (
        <div
          className="parent-sheet-backdrop"
          role="presentation"
          onClick={() => !busy && setExamSheetOpen(false)}
        >
          <section
            className="parent-exam-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Pemeriksaan anak"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="parent-sheet-close"
              onClick={() => setExamSheetOpen(false)}
              aria-label="Tutup"
            >
              <X />
            </button>

            {error && <p className="parent-sheet-error">{error}</p>}
            {activeExam ? (
              <>
                <span className="parent-sheet-kicker">SESI PEMERIKSAAN</span>
                <h2>
                  {activeExam.status === "completed"
                    ? "Pemeriksaan sudah selesai."
                    : "Pemeriksaan sedang aktif."}
                </h2>
                <p>
                  {activeExam.status === "completed"
                    ? "Hasil sudah tersimpan. Selesaikan sesi supaya alat kembali siap untuk anak berikutnya."
                    : "Sesi ini sedang menunggu atau berjalan di alat. Kontrol pemeriksaan dilakukan dari halaman ini agar layar alat cukup menjadi tampilan untuk anak."}
                </p>

                {activeExam.status === "running" &&
                  activeExam.stationAttention === "camera_retry_required" && (
                    <div className="parent-station-control-alert">
                      <strong>Kamera meminta tindakan petugas</strong>
                      <p>
                        {activeExam.stationAttentionMessage ||
                          "Wajah belum cukup stabil atau gambar belum dapat digunakan."}
                      </p>
                      <p>
                        Pastikan posisi anak sudah siap, lalu pilih tindakan
                        berikut. Tombol ini akan mengontrol layar /alat dari
                        halaman orang tua.
                      </p>
                      <div className="parent-station-control-actions">
                        <button
                          type="button"
                          className="portal-primary"
                          disabled={stationControlBusy}
                          onClick={() =>
                            void sendStationControl("retry_camera")
                          }
                        >
                          {stationControlBusy
                            ? "Mengirim…"
                            : "Ambil ulang wajah"}
                        </button>
                        <button
                          type="button"
                          className="portal-secondary"
                          disabled={stationControlBusy}
                          onClick={() => void sendStationControl("skip_camera")}
                        >
                          Lanjut tanpa analisis wajah
                        </button>
                      </div>
                    </div>
                  )}

                {activeExam.status === "running" &&
                  activeExam.stationStep &&
                  activeExam.stationAttention !== "camera_retry_required" && (
                    <small className="parent-station-step">
                      Tahap alat:{" "}
                      {activeExam.stationStep === "camera"
                        ? "pengambilan wajah"
                        : activeExam.stationStep === "prepare"
                          ? "persiapan posisi"
                          : activeExam.stationStep === "height"
                            ? "pengukuran tinggi"
                            : activeExam.stationStep === "weight"
                              ? "pengukuran berat"
                              : activeExam.stationStep === "analysis"
                                ? "menyiapkan hasil"
                                : "hasil"}
                    </small>
                  )}

                {activeExam.status === "completed" ? (
                  <button
                    className="portal-primary parent-sheet-primary"
                    disabled={busy}
                    onClick={() => void finishExamination()}
                  >
                    {busy ? "Menyelesaikan…" : "Selesaikan sesi"}
                  </button>
                ) : (
                  <button
                    className="portal-secondary parent-sheet-danger"
                    disabled={busy}
                    onClick={() => void cancelExamination()}
                  >
                    {busy ? "Membatalkan…" : "Batalkan sesi aktif"}
                  </button>
                )}
              </>
            ) : (
              <>
                <span className="parent-sheet-kicker">MULAI PEMERIKSAAN</span>
                <h2>Siapa yang akan diperiksa?</h2>
                <p>
                  Pilih anak. Metode pemeriksaan akan menyesuaikan usia anak.
                </p>
                {view.children.length === 0 ? (
                  <small>
                    Belum ada profil anak. Tambahkan anak dari menu Profil
                    terlebih dahulu.
                  </small>
                ) : (
                  <>
                    <label>
                      Profil anak
                      <select
                        value={selectedChildId}
                        onChange={(event) => selectChild(event.target.value)}
                      >
                        {view.children.map((child) => {
                          const months = ageInMonths(child.birthDate);
                          const eligible = months >= 0 && months <= 59;

                          return (
                            <option
                              key={child.id}
                              value={child.id}
                              disabled={!eligible}
                            >
                              {child.name} · {formatAge(months)}
                            </option>
                          );
                        })}
                      </select>
                    </label>

                    <div
                      className="parent-exam-mode-options"
                      role="group"
                      aria-label="Metode pemeriksaan"
                    >
                      <button
                        type="button"
                        className="parent-exam-mode-option"
                        aria-pressed={examInputMode === "device"}
                        disabled={!selectedChildCanUseDevice}
                        onClick={() => setExamInputMode("device")}
                      >
                        <strong>Pemeriksaan otomatis</strong>
                        <small>
                          Webcam + sensor TB dan BB. Tersedia untuk usia 24–59
                          bulan.
                        </small>
                      </button>
                      <button
                        type="button"
                        className="parent-exam-mode-option"
                        aria-pressed={examInputMode === "manual"}
                        disabled={!selectedChildInScope}
                        onClick={() => setExamInputMode("manual")}
                      >
                        <strong>Input data manual</strong>
                        <small>
                          Pilih anak yang sama, lalu masukkan PB/TB dan BB
                          terbaru.
                        </small>
                      </button>
                    </div>

                    {examInputMode === "manual" && selectedChildInScope ? (
                      <div className="parent-manual-form">
                        <div className="parent-manual-note">
                          <strong>
                            {selectedChildIsInfant
                              ? "Pemeriksaan manual bayi 0–23 bulan"
                              : "Pemeriksaan manual anak 24–59 bulan"}
                          </strong>
                          <span>
                            {selectedChildIsInfant
                              ? "Panjang badan (PB) diukur terlentang."
                              : "Tinggi badan (TB) diukur berdiri."}{" "}
                            Umur dan jenis kelamin diambil otomatis dari profil
                            anak, jadi tidak perlu diinput ulang.
                          </span>
                        </div>

                        <label>
                          {manualLinearLabel}
                          <div className="parent-manual-unit">
                            <input
                              type="number"
                              inputMode="decimal"
                              min="30"
                              max={selectedChildIsInfant ? "120" : "130"}
                              step="0.1"
                              value={manualLinearCm}
                              onChange={(event) => {
                                setManualLinearCm(event.target.value);
                                setManualExtremeWarning("");
                              }}
                              placeholder={
                                selectedChildIsInfant
                                  ? "Contoh: 76.2"
                                  : "Contoh: 102.4"
                              }
                            />
                            <span>cm</span>
                          </div>
                        </label>

                        <label>
                          Berat badan
                          <div className="parent-manual-unit">
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0.5"
                              max="40"
                              step="0.1"
                              value={manualWeightKg}
                              onChange={(event) => {
                                setManualWeightKg(event.target.value);
                                setManualExtremeWarning("");
                              }}
                              placeholder="Contoh: 15.2"
                            />
                            <span>kg</span>
                          </div>
                        </label>

                        <small>
                          Hasil dihitung berdasarkan{" "}
                          {selectedChildIsInfant ? "PB/U" : "TB/U"} dan BB/U
                          sesuai umur saat pemeriksaan.
                        </small>

                        {manualExtremeWarning && (
                          <div className="parent-manual-extreme-warning">
                            <strong>Nilai ekstrem terdeteksi</strong>
                            <p>{manualExtremeWarning}</p>
                            <p>
                              Ukur ulang terlebih dahulu. Jika hasil kedua tetap
                              sama dan posisi pengukuran sudah benar, simpan
                              sebagai nilai ekstrem terverifikasi. Sistem tidak
                              akan memaksakan status pertumbuhan otomatis dari
                              nilai tersebut.
                            </p>
                            <button
                              type="button"
                              className="portal-secondary"
                              disabled={busy}
                              onClick={() => void saveManualExamination(true)}
                            >
                              Konfirmasi nilai ekstrem
                            </button>
                          </div>
                        )}

                        <button
                          className="portal-primary parent-sheet-primary"
                          disabled={
                            !selectedChildId ||
                            !manualLinearCm ||
                            !manualWeightKg ||
                            busy
                          }
                          onClick={() => void saveManualExamination()}
                        >
                          {busy ? "Menyimpan…" : "Simpan pemeriksaan manual"}
                        </button>
                      </div>
                    ) : examInputMode === "device" &&
                      selectedChildCanUseDevice ? (
                      <>
                        <button
                          className="portal-primary parent-sheet-primary"
                          disabled={!selectedChildId || busy}
                          onClick={() => void startExamination()}
                        >
                          <Play size={19} />
                          {busy ? "Menyiapkan…" : "Mulai pemeriksaan otomatis"}
                        </button>
                        <small>
                          Sistem memakai webcam, sensor tinggi badan, dan sensor
                          berat badan pada alat StuntSpecula.
                        </small>
                      </>
                    ) : (
                      <small>
                        Profil ini berada di luar cakupan pemeriksaan 0–59
                        bulan.
                      </small>
                    )}
                  </>
                )}
              </>
            )}
          </section>
        </div>
      )}

      {assistantOpen && (
        <div
          className="parent-assistant-backdrop"
          role="presentation"
          onClick={() => setAssistantOpen(false)}
        >
          <aside
            className="parent-assistant-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Asisten Pertumbuhan"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="parent-assistant-drawer-head">
              <div>
                <span>ASISTEN PERTUMBUHAN</span>
                <strong>Tanya tentang hasil anak</strong>
              </div>
              <button
                onClick={() => setAssistantOpen(false)}
                aria-label="Tutup asisten"
              >
                <X />
              </button>
            </div>
            <ParentAssistant
              aiAvailable={view.aiAvailable}
              examinations={completedExams}
              selectedExam={selectedExam}
              selectedExamId={selectedExamId}
              onSelectExam={setSelectedExamId}
              messages={messages}
              consent={consent}
              onConsent={setConsent}
              question={question}
              onQuestion={setQuestion}
              busy={busy}
              onSend={send}
            />
          </aside>
        </div>
      )}
    </PortalShell>
  );
}
