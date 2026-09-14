import {
  ageInMonths,
  childProfileSchema,
  type ChildProfile,
} from "../lib/portal";
import type { Env } from "./env";
import { requireStaff } from "./auth";
import { ApiError, body, ok } from "./http";

const CHILD_SELECT =
  "SELECT id,code,name,birth_date AS birthDate,sex,guardian,created_at AS createdAt FROM children";
export async function listChildren(request: Request, env: Env) {
  await requireStaff(request, env);
  const search = (new URL(request.url).searchParams.get("q") || "").slice(
    0,
    80,
  );
  return ok(
    (
      await env.DB.prepare(
        `${CHILD_SELECT} WHERE name LIKE ? OR code LIKE ? ORDER BY created_at DESC LIMIT 100`,
      )
        .bind(`%${search}%`, `%${search}%`)
        .all()
    ).results,
  );
}
export async function createChild(request: Request, env: Env) {
  await requireStaff(request, env);
  const input = await body(request, childProfileSchema);
  let months: number;
  try {
    months = ageInMonths(input.birthDate);
  } catch {
    throw new ApiError(422, "Tanggal lahir tidak valid.");
  }
  if (months < 0 || months > 59)
    throw new ApiError(422, "Pemeriksaan ini untuk anak usia 0–59 bulan.");
  const id = crypto.randomUUID();
  try {
    await env.DB.prepare(
      "INSERT INTO children (id,code,name,birth_date,sex,guardian,created_at) VALUES (?,?,?,?,?,?,?)",
    )
      .bind(
        id,
        input.code.toUpperCase(),
        input.name,
        input.birthDate,
        input.sex,
        input.guardian,
        Date.now(),
      )
      .run();
  } catch (error) {
    if (String(error).includes("UNIQUE"))
      throw new ApiError(
        409,
        "Kode anak sudah digunakan. Pilih profil yang sudah ada.",
      );
    throw error;
  }
  return ok({ id }, 201);
}
export async function findChild(
  env: Env,
  id: string,
): Promise<ChildProfile | null> {
  return env.DB.prepare(`${CHILD_SELECT} WHERE id=?`)
    .bind(id)
    .first<ChildProfile>();
}
