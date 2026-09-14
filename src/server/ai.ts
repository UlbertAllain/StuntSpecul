import { z } from "zod";
import type { Env } from "./env";
import { ApiError, body, ok } from "./http";
import { parentMessages, requireParent } from "./access";
import { getExamination } from "./screenings";
import { rateLimit } from "./security";
import { geminiExplainer } from "./gemini";

export async function chat(request: Request, env: Env) {
  const session = await requireParent(request, env);
  const { message, consent } = await body(
    request,
    z.object({
      message: z
        .string()
        .trim()
        .min(1)
        .max(1500, "Pertanyaan maksimal 1.500 karakter."),
      consent: z.literal(true),
    }),
  );
  if (!consent)
    throw new ApiError(422, "Setujui penggunaan asisten terlebih dahulu.");
  if (!env.GEMINI_API_KEY || !env.GEMINI_MODEL)
    throw new ApiError(
      503,
      "Asisten belum terhubung. Hasil tetap dapat dibaca.",
      "ai_not_configured",
    );
  await rateLimit(env.DB, `chat-session:${session.hash}`, 20, 7200);
  await rateLimit(env.DB, `chat-minute:${session.hash}`, 4, 60);
  await rateLimit(env.DB, "chat-facility", 500, 86400);
  const locked = await env.DB.prepare(
    "UPDATE sessions SET chat_count=chat_count+1,busy_until=? WHERE token_hash=? AND expires_at>? AND chat_count<20 AND busy_until<? RETURNING token_hash",
  )
    .bind(Date.now() + 30_000, session.hash, Date.now(), Date.now())
    .first();
  if (!locked)
    throw new ApiError(
      429,
      "Tunggu jawaban sebelumnya atau batas percakapan sudah tercapai.",
      "chat_limited",
    );
  try {
    const history = await parentMessages(env, session.hash);
    const exam = await getExamination(env, session.examId);
    let answer: string;
    try {
      answer = await geminiExplainer(env).explain(exam, history, message);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        503,
        "Asisten belum merespons. Silakan coba lagi.",
        "ai_timeout",
      );
    }
    await requireParent(request, env);
    const now = Date.now();
    const userId = crypto.randomUUID();
    const answerId = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO chat_messages (id,session_hash,role,content,created_at) VALUES (?,?,'user',?,?)",
      ).bind(userId, session.hash, message, now),
      env.DB.prepare(
        "INSERT INTO chat_messages (id,session_hash,role,content,created_at) VALUES (?,?,'assistant',?,?)",
      ).bind(answerId, session.hash, answer, now + 1),
    ]);
    return ok({
      user: { id: userId, role: "user", content: message, createdAt: now },
      assistant: {
        id: answerId,
        role: "assistant",
        content: answer,
        createdAt: now + 1,
      },
    });
  } finally {
    await env.DB.prepare("UPDATE sessions SET busy_until=0 WHERE token_hash=?")
      .bind(session.hash)
      .run();
  }
}
