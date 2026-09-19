"use client";
import { useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  Send,
  LogOut,
  LockKeyhole,
  ArrowDown,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { api, ClientError, errorMessage } from "@/lib/api-client";
import type { ChatMessage, ParentView } from "@/lib/portal";
import { PortalShell, Message } from "./shell";
import { ResultSummary } from "./result-summary";

const QUESTIONS = [
  "Apa arti hasil pemeriksaan ini?",
  "Data apa yang belum lengkap?",
  "Apa yang perlu saya tanyakan kepada petugas?",
];
export function LegacyResultPortal() {
  const [view, setView] = useState<ParentView | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const chatRef = useRef<HTMLElement>(null);
  const lastRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function initialize() {
      // Defer until mount completes; a QR always takes precedence over an older session.
      await Promise.resolve();
      if (controller.signal.aborted) return;
      const hash = window.location.hash.slice(1);
      if (hash) {
        window.history.replaceState(null, "", window.location.pathname);
        setCode(hash);
        setLoading(false);
        return;
      }
      try {
        const result = await api<ParentView>("/parent/result", {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setView(result);
      } catch (e) {
        if (
          !controller.signal.aborted &&
          (!(e instanceof ClientError) || e.status !== 401)
        )
          setError(errorMessage(e));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void initialize();
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!view) return;
    const remaining = view.expiresAt - Date.now();
    const timer = setTimeout(
      () => {
        setView(null);
        setCode("");
        setError("Akses hasil sudah berakhir. Minta QR baru kepada petugas.");
      },
      Math.max(0, remaining),
    );
    return () => clearTimeout(timer);
  }, [view]);
  useEffect(() => {
    lastRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [view?.messages.length, busy]);
  async function exchange() {
    setBusy(true);
    setError("");
    try {
      await api("/parent/exchange", { method: "POST", body: { code } });
      setCode("");
      setView(await api<ParentView>("/parent/result"));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function send(text: string) {
    if (!text.trim() || busy || !view) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ user: ChatMessage; assistant: ChatMessage }>(
        "/parent/chat",
        { method: "POST", body: { message: text, consent } },
      );
      setView((old) =>
        old
          ? {
              ...old,
              messages: [...old.messages, result.user, result.assistant],
            }
          : old,
      );
      setMessage("");
    } catch (e) {
      if (e instanceof ClientError && e.status === 401) {
        setView(null);
        setCode("");
      }
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function close() {
    try {
      await api("/parent/logout", { method: "POST", body: {} });
      setView(null);
      setCode("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  if (!view)
    return (
      <PortalShell
        heading="Hasil si kecil, di tangan Anda"
        subtitle="Buka hasil pemeriksaan yang diberikan petugas."
      >
        <div className="portal-card access-card">
          <LockKeyhole size={40} />
          {loading ? (
            <Message>Memeriksa akses…</Message>
          ) : code ? (
            <>
              <h2>Siap membuka hasil?</h2>
              <p>
                Akses ini hanya untuk pendamping anak yang diperiksa. Pastikan
                QR diterima langsung dari petugas.
              </p>
              <button
                className="portal-primary"
                disabled={busy}
                onClick={exchange}
              >
                {busy ? "Membuka…" : "Buka hasil pemeriksaan"}
              </button>
            </>
          ) : (
            <>
              <h2>Pindai QR dari petugas</h2>
              <p>
                Setelah pemeriksaan, petugas dapat memberikan QR untuk membuka
                hasil dan bertanya kepada asisten.
              </p>
            </>
          )}
          {error && <Message error>{error}</Message>}
        </div>
      </PortalShell>
    );
  return (
    <PortalShell
      heading="Mari pahami hasil si kecil"
      subtitle="Ringkasan pemeriksaan untuk Anda dan keluarga."
      actions={
        <button className="portal-text" onClick={close}>
          <LogOut size={18} />
          Tutup akses
        </button>
      }
    >
      <div className="parent-layout">
        <div className="parent-result">
          <ResultSummary result={view.result} />
          <button
            className="portal-primary ask-result"
            onClick={() =>
              chatRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          >
            <MessageCircle size={20} />
            Tanyakan hasil ini
            <ArrowDown size={18} />
          </button>
          <p className="portal-note">
            Akses berakhir pukul{" "}
            {new Date(view.expiresAt).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            . Untuk tindak lanjut, diskusikan hasil dengan petugas.
          </p>
        </div>
        <section
          className="portal-card parent-chat"
          ref={chatRef}
          aria-label="Asisten hasil"
        >
          <div className="chat-title">
            <span>
              <MessageCircle />
            </span>
            <div>
              <h2>Asisten Hasil</h2>
              <p>Pertanyaan tentang pemeriksaan {view.result.childName}</p>
            </div>
          </div>
          {!view.aiAvailable ? (
            <Message>
              Asisten belum terhubung. Hasil pemeriksaan tetap dapat Anda baca.
            </Message>
          ) : (
            <>
              <p className="portal-note">
                Jawaban dibuat oleh AI dan dapat keliru. Petugas membantu
                memastikan arti hasil dan langkah selanjutnya.
              </p>
              <label className="checkbox-label ai-consent">
                <Checkbox
                  checked={consent}
                  onCheckedChange={(v) => setConsent(v === true)}
                />
                <span>
                  Saya setuju pertanyaan dan ringkasan hasil dikirim ke layanan
                  AI. Nama dan foto anak tidak disertakan otomatis.
                </span>
              </label>
              <div
                className="chat-log"
                role="log"
                aria-label="Percakapan hasil"
              >
                {view.messages.length === 0 ? (
                  <div className="chat-welcome">
                    <h3>Ada yang ingin ditanyakan?</h3>
                    <p>
                      Saya membantu menjelaskan hasil yang tampil di halaman
                      ini.
                    </p>
                  </div>
                ) : (
                  view.messages.map((item) => (
                    <div key={item.id} className={`chat-bubble ${item.role}`}>
                      <span>
                        {item.role === "user" ? "Anda" : "Asisten Hasil"}
                      </span>
                      <p>{item.content}</p>
                    </div>
                  ))
                )}
                {busy && (
                  <div className="chat-bubble assistant" role="status">
                    Sedang menyiapkan jawaban…
                  </div>
                )}
                <div ref={lastRef} />
              </div>
              <div className="chat-suggestions">
                {QUESTIONS.map((question) => (
                  <button
                    key={question}
                    disabled={busy || !consent}
                    onClick={() => send(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
              <form
                className="chat-input"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send(message);
                }}
              >
                <textarea
                  aria-label="Pertanyaan untuk asisten"
                  placeholder="Tulis pertanyaan tentang hasil…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={1500}
                  rows={3}
                  disabled={!consent || busy}
                />
                <button
                  className="portal-primary"
                  disabled={!consent || busy || !message.trim()}
                  aria-label="Kirim pertanyaan"
                >
                  <Send size={19} />
                </button>
              </form>
              <p className="portal-note">
                Hindari menulis NIK, alamat, atau data pribadi lain. Maksimal 20
                pertanyaan dalam sesi ini.
              </p>
            </>
          )}
          {error && <Message error>{error}</Message>}
        </section>
      </div>
    </PortalShell>
  );
}
