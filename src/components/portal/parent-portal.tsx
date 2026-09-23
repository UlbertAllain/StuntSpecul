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
  Camera,
  ChartNoAxesCombined,
  Home,
  LogOut,
  MessageCircle,
  Play,
  Send,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { api, ClientError, errorMessage } from "@/lib/api-client";
import type { ChatMessage, Examination, ParentAccountView } from "@/lib/portal";
import { formatAge, formatReading } from "@/lib/screening";
import { ageInMonths } from "@/lib/portal";
import { growthStatusLabel } from "@/lib/growth";
import { Message, PortalShell } from "./shell";
import { uploadProfilePhoto } from "@/lib/cloudinary";
import { ParentGrowthInsights } from "./parent-growth-insights";

type Tab = "home" | "insights" | "history" | "profile";

const QUESTIONS = [
  "Apa arti hasil pemeriksaan terakhir?",
  "Apa yang sebaiknya saya pantau di rumah?",
  "Kapan saya perlu berkonsultasi ke tenaga kesehatan?",
];

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
        const latest = completed(value.examinations)[0];
        if (latest) setSelectedExamId(latest.id);
        if (value.children[0]) setSelectedChildId(value.children[0].id);
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

  const completedExams = useMemo(
    () => completed(view?.examinations || []),
    [view?.examinations],
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
    }, 2500);

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
          aria-current={tab === "history" ? "page" : undefined}
          onClick={() => setTab("history")}
        >
          <ChartNoAxesCombined /> Riwayat
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
            latest={latest}
            activeExam={activeExam}
            onStart={() => setExamSheetOpen(true)}
          />
        )}
        {tab === "insights" && (
          <ParentInsights
            examinations={completedExams}
            child={view.children[0] || null}
          />
        )}
        {tab === "history" && <ParentHistory examinations={completedExams} />}
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
          aria-current={tab === "history" ? "page" : undefined}
          onClick={() => setTab("history")}
        >
          <ChartNoAxesCombined />
          <span>Riwayat</span>
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
                    : "Sesi ini sedang menunggu atau berjalan di alat. Jika sesi sebelumnya tertinggal, Anda dapat membatalkannya."}
                </p>
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
                <p>Pilih anak, lalu arahkan si kecil ke alat StuntSpecula.</p>
                <label>
                  Profil anak
                  <select
                    value={selectedChildId}
                    onChange={(event) => setSelectedChildId(event.target.value)}
                  >
                    {view.children.map((child) => {
                      const months = ageInMonths(child.birthDate);
                      const eligible = months >= 24 && months <= 59;
                      return (
                        <option
                          key={child.id}
                          value={child.id}
                          disabled={!eligible}
                        >
                          {child.name} · {formatAge(months)}
                          {!eligible ? " · belum sesuai usia alat" : ""}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <button
                  className="portal-primary parent-sheet-primary"
                  disabled={!selectedChildId || busy}
                  onClick={() => void startExamination()}
                >
                  <Play size={19} />
                  {busy ? "Menyiapkan…" : "Mulai pemeriksaan"}
                </button>
                <small>
                  Pemeriksaan standing height digunakan untuk anak usia 24–59
                  bulan.
                </small>
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

function MiniGrowthChart({ examinations }: { examinations: Examination[] }) {
  const values = completed(examinations)
    .filter((exam) => exam.heightCm !== null)
    .slice(0, 6)
    .reverse();

  if (values.length < 2) {
    return (
      <div className="parent-mini-chart empty">
        <span>Grafik akan muncul setelah ada beberapa pemeriksaan.</span>
      </div>
    );
  }

  const heights = values.map((exam) => exam.heightCm as number);
  const min = Math.min(...heights) - 2;
  const max = Math.max(...heights) + 2;
  const range = Math.max(1, max - min);
  const points = values
    .map((exam, index) => {
      const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
      const y = 88 - (((exam.heightCm as number) - min) / range) * 70;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="parent-mini-chart">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline
          points={points}
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span>Perkembangan tinggi badan</span>
    </div>
  );
}

function ParentHome({
  view,
  latest,
  activeExam,
  onStart,
}: {
  view: ParentAccountView;
  latest: Examination | null;
  activeExam: Examination | null;
  onStart: () => void;
}) {
  const child = view.children[0];

  return (
    <>
      <section className="mobile-dashboard-card parent-growth-card">
        <div className="parent-dashboard-head">
          <div>
            <span>PROFIL PERTUMBUHAN</span>
            <h2>{child?.name || "Anak"}</h2>
            <p>
              {child
                ? formatAge(ageInMonths(child.birthDate))
                : "Belum ada profil"}
              {child
                ? ` · ${child.sex === "male" ? "Laki-laki" : "Perempuan"}`
                : ""}
            </p>
          </div>
          <span className="parent-dashboard-avatar">
            {child?.name.slice(0, 1).toUpperCase() || "A"}
          </span>
        </div>

        <MiniGrowthChart examinations={view.examinations} />

        <div className="parent-latest-metrics">
          <article>
            <span>Tinggi</span>
            <strong>{formatReading(latest?.heightCm ?? null)}</strong>
            <small>cm</small>
          </article>
          <article>
            <span>Berat</span>
            <strong>{formatReading(latest?.weightKg ?? null)}</strong>
            <small>kg</small>
          </article>
          <article>
            <span>TB/U</span>
            <strong className="metric-status">
              {latest ? growthStatusLabel(latest.growthStatus) : "Belum ada"}
            </strong>
          </article>
        </div>
      </section>

      {activeExam && (
        <button className="simple-session-banner" onClick={onStart}>
          <div>
            <strong>
              {activeExam.status === "completed"
                ? "Hasil sudah siap"
                : "Pemeriksaan sedang aktif"}
            </strong>
            <span>
              {activeExam.status === "completed"
                ? "Selesaikan sesi agar alat siap digunakan kembali."
                : "Buka status sesi pemeriksaan anak."}
            </span>
          </div>
          <Play size={19} />
        </button>
      )}

      <section className="mobile-dashboard-card parent-info-card">
        <div className="simple-card-title">
          <TrendingUp size={19} />
          <div>
            <h3>Ringkasan terbaru</h3>
            <p>
              {latest
                ? "Pemeriksaan " +
                  new Date(
                    latest.completedAt || latest.createdAt,
                  ).toLocaleDateString("id-ID")
                : "Belum ada pemeriksaan tersimpan."}
            </p>
          </div>
        </div>
        {latest && (
          <div className="parent-summary-lines">
            <div>
              <span>Status pertumbuhan</span>
              <strong>{growthStatusLabel(latest.growthStatus)}</strong>
            </div>
            <div>
              <span>Analisis wajah</span>
              <strong>
                {latest.facialStatus
                  ? latest.facialStatus === "stunting_indication"
                    ? "Indikasi pendukung"
                    : latest.facialStatus === "non_stunting_indication"
                      ? "Tidak terindikasi"
                      : "Foto perlu diulang"
                  : "Belum tersedia"}
              </strong>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function ParentInsights({
  examinations,
  child,
}: {
  examinations: Examination[];
  child: ParentAccountView["children"][number] | null;
}) {
  return (
    <>
      <div className="section-heading parent-insight-heading">
        <div>
          <span className="parent-section-eyebrow">PERTUMBUHAN ANAK</span>
          <h2>Insight pertumbuhan</h2>
          <p className="portal-note">
            Grafik membantu melihat pola tinggi, berat, dan TB/U dari waktu ke
            waktu.
          </p>
        </div>
      </div>
      <ParentGrowthInsights examinations={examinations} child={child} />
    </>
  );
}

function ParentHistory({ examinations }: { examinations: Examination[] }) {
  return (
    <>
      <div className="section-heading compact-section-heading">
        <div>
          <h2>Riwayat pertumbuhan</h2>
          <p className="portal-note">
            Semua hasil penting langsung terlihat tanpa membuka detail lagi.
          </p>
        </div>
      </div>

      {examinations.length === 0 ? (
        <div className="portal-empty">
          <h3>Belum ada riwayat</h3>
          <p>Riwayat akan terisi otomatis setelah pemeriksaan selesai.</p>
        </div>
      ) : (
        <div className="parent-flat-history">
          {examinations.map((exam) => (
            <article key={exam.id} className="parent-flat-history-card">
              <div className="parent-history-head">
                <div>
                  <strong>
                    {new Date(
                      exam.completedAt || exam.createdAt,
                    ).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </strong>
                </div>

                <span className="parent-history-status">
                  {growthStatusLabel(exam.growthStatus)}
                </span>
              </div>

              <dl className="parent-history-metrics">
                <div>
                  <dt>Tinggi</dt>
                  <dd>{formatReading(exam.heightCm)} cm</dd>
                </div>

                <div>
                  <dt>Berat</dt>
                  <dd>{formatReading(exam.weightKg)} kg</dd>
                </div>

                <div>
                  <dt>Model A</dt>
                  <dd>
                    {exam.facialStatus === "stunting_indication"
                      ? "Indikasi"
                      : exam.facialStatus === "non_stunting_indication"
                        ? "Tidak terindikasi"
                        : exam.facialStatus === "rejected"
                          ? "Ulang foto"
                          : "Belum tersedia"}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function ParentAssistant({
  aiAvailable,
  examinations,
  selectedExam,
  selectedExamId,
  onSelectExam,
  messages,
  consent,
  onConsent,
  question,
  onQuestion,
  busy,
  onSend,
}: {
  aiAvailable: boolean;
  examinations: Examination[];
  selectedExam: Examination | null;
  selectedExamId: string;
  onSelectExam: (id: string) => void;
  messages: ChatMessage[];
  consent: boolean;
  onConsent: (value: boolean) => void;
  question: string;
  onQuestion: (value: string) => void;
  busy: boolean;
  onSend: (text: string) => Promise<void>;
}) {
  return (
    <section className="portal-card parent-chat">
      <div className="chat-title">
        <span>
          <MessageCircle />
        </span>
        <div>
          <h2>Asisten Pertumbuhan</h2>
          <p>Membantu menjelaskan hasil yang sudah dihitung sistem.</p>
        </div>
      </div>
      {examinations.length === 0 ? (
        <Message>
          Asisten tersedia setelah anak memiliki hasil pemeriksaan.
        </Message>
      ) : !aiAvailable ? (
        <Message>
          Asisten sedang tidak tersedia. Hasil tetap dapat dilihat dari riwayat.
        </Message>
      ) : (
        <>
          <label>
            Pilih hasil yang ingin dibahas
            <select
              value={selectedExamId || selectedExam?.id || ""}
              onChange={(e) => onSelectExam(e.target.value)}
            >
              {examinations.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {new Date(
                    exam.completedAt || exam.createdAt,
                  ).toLocaleDateString("id-ID")}{" "}
                  · {exam.childName}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-label ai-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => onConsent(e.target.checked)}
            />
            <span>
              Saya setuju pertanyaan dan ringkasan hasil dikirim ke layanan AI.
              Nama dan foto anak tidak disertakan otomatis.
            </span>
          </label>
          <div className="chat-log" role="log" aria-label="Percakapan asisten">
            {messages.length === 0 ? (
              <div className="chat-welcome">
                <h3>Ada yang ingin dipahami?</h3>
                <p>
                  Pilih pertanyaan singkat atau tulis pertanyaan Anda sendiri.
                </p>
              </div>
            ) : (
              messages.map((item) => (
                <div key={item.id} className={`chat-bubble ${item.role}`}>
                  <span>{item.role === "user" ? "Anda" : "Asisten"}</span>
                  <p>{item.content}</p>
                </div>
              ))
            )}
            {busy && (
              <div className="chat-bubble assistant">Menyiapkan jawaban…</div>
            )}
          </div>
          <div className="chat-suggestions">
            {QUESTIONS.map((item) => (
              <button
                key={item}
                disabled={!consent || busy}
                onClick={() => void onSend(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              void onSend(question);
            }}
          >
            <textarea
              value={question}
              onChange={(e) => onQuestion(e.target.value)}
              placeholder="Tulis pertanyaan tentang hasil anak…"
              maxLength={1500}
              rows={3}
              disabled={!consent || busy}
            />
            <button
              className="portal-primary"
              disabled={!consent || busy || !question.trim()}
              aria-label="Kirim pertanyaan"
            >
              <Send size={19} />
            </button>
          </form>
        </>
      )}
    </section>
  );
}

function ParentProfile({
  view,
  onRefresh,
}: {
  view: ParentAccountView;
  onRefresh: () => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const child = view.children[0];

  async function uploadAvatar(file: File | undefined) {
    if (!file || uploading) return;
    setUploading(true);
    setProfileError("");
    try {
      const uploaded = await uploadProfilePhoto(file);
      await api("/parent-account/profile", {
        method: "PATCH",
        body: {
          avatarUrl: uploaded.secureUrl,
          avatarPublicId: uploaded.publicId,
        },
      });
      await onRefresh();
    } catch (cause) {
      setProfileError(errorMessage(cause));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <section className="parent-profile-hero">
        <label className="parent-profile-photo">
          {view.parent.avatarUrl ? (
            <Image
              src={view.parent.avatarUrl}
              alt={view.parent.name}
              width={184}
              height={184}
              unoptimized
            />
          ) : (
            <span>{view.parent.name.slice(0, 1).toUpperCase()}</span>
          )}
          <i>
            <Camera size={16} />
          </i>
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(event) => void uploadAvatar(event.target.files?.[0])}
          />
        </label>
        <h2>{view.parent.name}</h2>
        <p>{view.parent.email}</p>
        <small>
          {uploading ? "Mengunggah foto…" : "Tekan foto untuk mengganti profil"}
        </small>
      </section>
      {profileError && <Message error>{profileError}</Message>}
      <section className="profile-menu-card">
        <div>
          <span>Profil anak</span>
          <strong>{child?.name || "Belum ada profil"}</strong>
        </div>
        {child && (
          <>
            <div>
              <span>Tanggal lahir</span>
              <strong>
                {new Date(`${child.birthDate}T00:00:00Z`).toLocaleDateString(
                  "id-ID",
                )}
              </strong>
            </div>
            <div>
              <span>Jenis kelamin</span>
              <strong>
                {child.sex === "male" ? "Laki-laki" : "Perempuan"}
              </strong>
            </div>
            <div>
              <span>Kode anak</span>
              <strong>{child.code}</strong>
            </div>
          </>
        )}
      </section>
      <p className="portal-note profile-note">
        Foto profil membantu membedakan akun. Data pemeriksaan tidak dapat
        diubah dari halaman profil.
      </p>
    </>
  );
}
