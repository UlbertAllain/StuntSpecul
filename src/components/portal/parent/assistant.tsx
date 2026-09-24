"use client";

import { MessageCircle, Send } from "lucide-react";
import type { ChatMessage, Examination } from "@/lib/portal";
import { Message } from "../shared/shell";

const QUESTIONS = [
  "Apa arti hasil pemeriksaan terakhir?",
  "Apa yang sebaiknya saya pantau di rumah?",
  "Kapan saya perlu berkonsultasi ke tenaga kesehatan?",
];

export function ParentAssistant({
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

