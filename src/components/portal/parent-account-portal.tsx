"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Baby,
  ChartNoAxesCombined,
  Home,
  LogOut,
  MessageCircle,
  Send,
  UserRound,
} from "lucide-react";
import { api, ClientError, errorMessage } from "@/lib/api-client";
import type {
  ChatMessage,
  Examination,
  ParentAccountSummary,
  ParentAccountView,
} from "@/lib/portal";
import { formatAge, formatReading } from "@/lib/screening";
import { growthStatusLabel } from "@/lib/growth";
import { Message, PortalShell } from "./shell";
import { ResultSummary } from "./result-summary";

type Tab = "home" | "history" | "assistant" | "profile";
type AuthMode = "login" | "register";

const QUESTIONS = [
  "Apa arti hasil pemeriksaan terakhir?",
  "Apa yang sebaiknya saya pantau di rumah?",
  "Kapan saya perlu berkonsultasi ke tenaga kesehatan?",
];

function completed(exams: Examination[]) {
  return exams.filter((exam) => exam.status === "completed");
}

export function ParentAccountPortal() {
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

  useEffect(() => {
    const controller = new AbortController();
    api<ParentAccountView>("/parent-account/me", { signal: controller.signal })
      .then((value) => {
        setView(value);
        const latest = completed(value.examinations)[0];
        if (latest) setSelectedExamId(latest.id);
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

  useEffect(() => {
    if (tab !== "assistant" || !selectedExamForChatId) return;
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
  }, [tab, selectedExamForChatId]);

  async function refresh() {
    setView(await api<ParentAccountView>("/parent-account/me"));
  }

  async function logout() {
    await api("/parent-account/logout", { method: "POST", body: {} });
    setView(null);
    setTab("home");
    setMessages([]);
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
          setView(await api<ParentAccountView>("/parent-account/me"));
          setError("");
        }}
      />
    );

  return (
    <PortalShell
      heading={`Halo, ${view.parent.name}`}
      subtitle="Pantau pertumbuhan anak dan pahami hasil pemeriksaan dari satu tempat."
      actions={
        <button className="portal-text" onClick={logout}>
          <LogOut size={18} /> Keluar
        </button>
      }
    >
      <nav className="portal-nav" aria-label="Menu orang tua">
        <button
          aria-current={tab === "home" ? "page" : undefined}
          onClick={() => setTab("home")}
        >
          <Home /> Beranda
        </button>
        <button
          aria-current={tab === "history" ? "page" : undefined}
          onClick={() => setTab("history")}
        >
          <ChartNoAxesCombined /> Riwayat
        </button>
        <button
          aria-current={tab === "assistant" ? "page" : undefined}
          onClick={() => setTab("assistant")}
        >
          <MessageCircle /> Asisten
        </button>
        <button
          aria-current={tab === "profile" ? "page" : undefined}
          onClick={() => setTab("profile")}
        >
          <UserRound /> Profil
        </button>
      </nav>

      {error && <Message error>{error}</Message>}
      <div className="portal-content">
        {tab === "home" && (
          <ParentHome view={view} latest={latest} onRefresh={refresh} />
        )}
        {tab === "history" && (
          <ParentHistory
            examinations={completedExams}
            selectedExamId={selectedExamId}
            onSelect={setSelectedExamId}
          />
        )}
        {tab === "assistant" && (
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
        )}
        {tab === "profile" && <ParentProfile view={view} />}
      </div>
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
      heading="StuntSpecula untuk Orang Tua"
      subtitle="Akun ini digunakan untuk memantau hasil dan riwayat pertumbuhan anak. Pemeriksaan tetap dilakukan melalui alat di fasilitas kesehatan."
    >
      <form
        className="portal-card profile-form mx-auto max-w-xl"
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
            <div className="portal-card !mb-2">
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
          <input
            required
            type="password"
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
    </PortalShell>
  );
}

function ParentHome({
  view,
  latest,
  onRefresh,
}: {
  view: ParentAccountView;
  latest: Examination | null;
  onRefresh: () => Promise<void>;
}) {
  const child = view.children[0];
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <article className="portal-card !mb-0 md:col-span-2">
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
        <article className="portal-card !mb-0">
          <p className="portal-note">Pemeriksaan tersimpan</p>
          <strong className="mt-2 block text-3xl font-black">
            {completed(view.examinations).length}
          </strong>
        </article>
      </div>

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
