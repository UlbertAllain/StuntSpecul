"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Baby,
  ChartNoAxesCombined,
  Home,
  LogOut,
  MessageCircle,
  Play,
  Send,
  Sparkles,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { api, ClientError, errorMessage } from "@/lib/api-client";
import type {
  ChatMessage,
  Examination,
  ParentAccountSummary,
  ParentAccountView,
} from "@/lib/portal";
import { formatAge, formatReading } from "@/lib/screening";
import { ageInMonths } from "@/lib/portal";
import { growthStatusLabel } from "@/lib/growth";
import { Message, PortalShell } from "./shell";
import { PasswordInput } from "./password-input";
import { ResultSummary } from "./result-summary";
import { ParentGrowthInsights } from "./parent-growth-insights";

type Tab = "home" | "insights" | "history" | "profile";
type AuthMode = "login" | "register";

const QUESTIONS = [
  "Apa arti hasil pemeriksaan terakhir?",
  "Apa yang sebaiknya saya pantau di rumah?",
  "Kapan saya perlu berkonsultasi ke tenaga kesehatan?",
];

function completed(exams: Examination[]) {
  return exams.filter((exam) => exam.status === "completed");
}

export function ParentPortal() {
  const [view, setView] = useState<ParentAccountView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("home");
  const [mode, setMode] = useState<AuthMode>("login");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [consent, setConsent] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [examSheetOpen, setExamSheetOpen] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState("");

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
        if (
          !controller.signal.aborted &&
          (!(e instanceof ClientError) || e.status !== 401)
        )
          setError(errorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

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
    await api("/parent-account/logout", { method: "POST", body: {} });
    setView(null);
    setTab("home");
    setMessages([]);
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
      <ParentAccountAuth
        mode={mode}
        error={error}
        busy={busy}
        onMode={setMode}
        onBusy={setBusy}
        onError={setError}
        onSuccess={async (parent) => {
          void parent;
          const nextView = await api<ParentAccountView>("/parent-account/me");
          setView(nextView);
          if (nextView.children[0]) setSelectedChildId(nextView.children[0].id);
          const latestExam = completed(nextView.examinations)[0];
          if (latestExam) setSelectedExamId(latestExam.id);
          setError("");
        }}
      />
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
            onRefresh={refresh}
            onStart={() => setExamSheetOpen(true)}
          />
        )}
        {tab === "insights" && (
          <ParentInsights
            examinations={completedExams}
            child={view.children[0] || null}
          />
        )}
        {tab === "history" && (
          <ParentHistory
            examinations={completedExams}
            selectedExamId={selectedExamId}
            onSelect={setSelectedExamId}
          />
        )}
        {tab === "profile" && <ParentProfile view={view} />}
      </div>

      <button
        className="parent-ai-fab"
        onClick={() => setAssistantOpen(true)}
        aria-label="Buka Asisten Pertumbuhan"
      >
        <Sparkles size={20} />
        <span>Asisten</span>
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

function ParentAccountAuth({
  mode,
  error,
  busy,
  onMode,
  onBusy,
  onError,
  onSuccess,
}: {
  mode: AuthMode;
  error: string;
  busy: boolean;
  onMode: (mode: AuthMode) => void;
  onBusy: (busy: boolean) => void;
  onError: (message: string) => void;
  onSuccess: (parent: ParentAccountSummary) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [childName, setChildName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "">("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    onBusy(true);
    onError("");
    try {
      const parent = await api<ParentAccountSummary>(
        mode === "login" ? "/parent-account/login" : "/parent-account/register",
        {
          method: "POST",
          body:
            mode === "login"
              ? { email, password }
              : {
                  name,
                  email,
                  password,
                  child: { name: childName, birthDate, sex },
                },
        },
      );
      await onSuccess(parent);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      onBusy(false);
    }
  }

  return (
    <PortalShell
      tone="parent"
      heading="StuntSpecula untuk Orang Tua"
      subtitle="Pantau pertumbuhan anak dan mulai pemeriksaan langsung dari akun orang tua saat berada di fasilitas."
    >
      <div className="parent-auth-layout">
        <aside className="parent-auth-visual" aria-hidden="true">
          <span className="parent-auth-bubble">
            {mode === "login" ? "Hai, ketemu lagi! 👋" : "Yuk, mulai pantau!"}
          </span>
          <div className="parent-auth-mascot">
            <Image
              src="/images/mimo-cheer.png"
              alt=""
              width={800}
              height={800}
              className="h-full w-full object-contain"
            />
          </div>
          <strong>
            {mode === "login"
              ? "Lihat bagaimana si kecil tumbuh dari waktu ke waktu."
              : "Satu akun untuk melihat riwayat pertumbuhan si kecil."}
          </strong>
          <p>
            Saat berada di fasilitas, orang tua dapat memulai pemeriksaan dari
            HP lalu mendampingi si kecil mengikuti arahan Mimo di alat.
          </p>
        </aside>

        <form
          className="portal-card profile-form parent-auth-form"
          onSubmit={submit}
        >
          <div className="section-heading">
            <div>
              <h2>{mode === "login" ? "Masuk" : "Buat akun orang tua"}</h2>
              <p className="portal-note">
                {mode === "login"
                  ? "Gunakan akun yang terhubung dengan profil anak."
                  : "Pendaftaran awal membuat satu profil anak. Pengukuran tidak dapat diubah dari akun orang tua."}
              </p>
            </div>
          </div>

          {mode === "register" && (
            <>
              <label>
                Nama orang tua / wali
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <div className="portal-card parent-child-register !mb-2">
                <h3>
                  <Baby size={18} /> Profil anak
                </h3>
                <label>
                  Nama anak
                  <input
                    required
                    minLength={2}
                    maxLength={80}
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                  />
                </label>
                <label>
                  Tanggal lahir
                  <input
                    required
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </label>
                <label>
                  Jenis kelamin
                  <select
                    required
                    value={sex}
                    onChange={(e) =>
                      setSex(e.target.value as "male" | "female" | "")
                    }
                  >
                    <option value="">Pilih jenis kelamin</option>
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                  </select>
                </label>
              </div>
            </>
          )}

          <label>
            Email
            <input
              required
              type="email"
              maxLength={160}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <PasswordInput
              required
              minLength={12}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
            {mode === "register" && <small>Minimal 12 karakter.</small>}
          </label>
          <button
            className="portal-primary w-full"
            disabled={busy || (mode === "register" && !sex)}
          >
            {busy ? "Memproses…" : mode === "login" ? "Masuk" : "Buat akun"}
          </button>
          <button
            type="button"
            className="portal-text justify-center"
            onClick={() => {
              onMode(mode === "login" ? "register" : "login");
              onError("");
            }}
          >
            {mode === "login"
              ? "Belum punya akun? Buat akun"
              : "Sudah punya akun? Masuk"}
          </button>
          {error && <Message error>{error}</Message>}
        </form>
      </div>
    </PortalShell>
  );
}

function ParentHome({
  view,
  latest,
  activeExam,
  onRefresh,
  onStart,
}: {
  view: ParentAccountView;
  latest: Examination | null;
  activeExam: Examination | null;
  onRefresh: () => Promise<void>;
  onStart: () => void;
}) {
  const child = view.children[0];
  return (
    <>
      <div className="parent-home-overview grid gap-4 md:grid-cols-3">
        <article className="portal-card parent-child-summary !mb-0 md:col-span-2">
          <p className="portal-note">Profil pertumbuhan</p>
          <h2>{child?.name || "Anak"}</h2>
          <p>
            {latest
              ? formatAge(latest.ageMonths)
              : "Usia akan tampil setelah pemeriksaan"}
            {child
              ? ` · ${child.sex === "male" ? "Laki-laki" : "Perempuan"}`
              : ""}
          </p>
        </article>
        <article className="portal-card parent-count-summary !mb-0">
          <p className="portal-note">Pemeriksaan tersimpan</p>
          <strong className="mt-2 block text-3xl font-black">
            {completed(view.examinations).length}
          </strong>
        </article>
      </div>

      <button className="parent-home-start" onClick={onStart}>
        <span>
          <Play size={22} />
        </span>
        <div>
          <strong>
            {activeExam?.status === "completed"
              ? "Selesaikan pemeriksaan"
              : activeExam
                ? "Lihat sesi aktif"
                : "Mulai pemeriksaan"}
          </strong>
          <small>
            {activeExam
              ? "Kelola sesi anak yang sedang menggunakan alat."
              : "Mulai langsung dari HP orang tua."}
          </small>
        </div>
      </button>

      {latest ? (
        <section className="mt-6">
          <div className="section-heading">
            <div>
              <h2>Hasil terbaru</h2>
              <p className="portal-note">
                Hasil masuk otomatis setelah pemeriksaan di fasilitas selesai.
              </p>
            </div>
            <button className="portal-text" onClick={() => void onRefresh()}>
              Perbarui
            </button>
          </div>
          <ResultSummary result={latest} />
        </section>
      ) : (
        <div className="portal-empty mt-6">
          <ChartNoAxesCombined />
          <h3>Belum ada hasil pemeriksaan</h3>
          <p>
            Setelah anak diperiksa menggunakan alat StuntSpecula, hasil akan
            muncul otomatis di akun ini.
          </p>
        </div>
      )}
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

function ParentHistory({
  examinations,
  selectedExamId,
  onSelect,
}: {
  examinations: Examination[];
  selectedExamId: string;
  onSelect: (id: string) => void;
}) {
  const selected =
    examinations.find((e) => e.id === selectedExamId) || examinations[0];
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Riwayat pertumbuhan</h2>
          <p className="portal-note">
            Bandingkan hasil antar pemeriksaan untuk melihat perubahan dari
            waktu ke waktu.
          </p>
        </div>
      </div>
      {examinations.length === 0 ? (
        <div className="portal-empty">
          <h3>Belum ada riwayat</h3>
          <p>Riwayat akan terisi otomatis dari pemeriksaan di fasilitas.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="examination-list">
            {examinations.map((exam) => (
              <button
                key={exam.id}
                className="examination-row text-left"
                aria-current={selected?.id === exam.id ? "true" : undefined}
                onClick={() => onSelect(exam.id)}
              >
                <span>
                  <strong>
                    {new Date(
                      exam.completedAt || exam.createdAt,
                    ).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </strong>
                  <small>{growthStatusLabel(exam.growthStatus)}</small>
                </span>
                <span className="row-readings">
                  {formatReading(exam.heightCm)} cm /{" "}
                  {formatReading(exam.weightKg)} kg
                </span>
              </button>
            ))}
          </div>
          <div>{selected && <ResultSummary result={selected} />}</div>
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

function ParentProfile({ view }: { view: ParentAccountView }) {
  return (
    <>
      <section className="portal-card">
        <h2>Profil orang tua</h2>
        <dl className="portal-details">
          <div>
            <dt>Nama</dt>
            <dd>{view.parent.name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{view.parent.email}</dd>
          </div>
          <div>
            <dt>Akses</dt>
            <dd>Monitoring hasil pertumbuhan</dd>
          </div>
        </dl>
      </section>
      {view.children.map((child) => (
        <section className="portal-card" key={child.id}>
          <h3>
            <Baby size={18} /> {child.name}
          </h3>
          <dl className="portal-details">
            <div>
              <dt>Kode anak</dt>
              <dd>{child.code}</dd>
            </div>
            <div>
              <dt>Tanggal lahir</dt>
              <dd>
                {new Date(`${child.birthDate}T00:00:00Z`).toLocaleDateString(
                  "id-ID",
                )}
              </dd>
            </div>
            <div>
              <dt>Jenis kelamin</dt>
              <dd>{child.sex === "male" ? "Laki-laki" : "Perempuan"}</dd>
            </div>
          </dl>
          <p className="portal-note">
            Data hasil pengukuran tidak dapat diubah dari akun orang tua. Bila
            profil anak perlu dikoreksi, hubungi petugas fasilitas.
          </p>
        </section>
      ))}
    </>
  );
}
