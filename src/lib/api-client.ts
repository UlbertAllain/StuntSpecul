export class ClientError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: options.method || "GET",
    credentials: "same-origin",
    cache: "no-store",
    signal: options.signal,
    headers:
      options.body === undefined
        ? undefined
        : { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = (await response.json().catch(() => null)) as {
    success: boolean;
    data: T;
    message?: string;
    code?: string;
  } | null;
  if (!response.ok || !payload?.success)
    throw new ClientError(
      payload?.message || "Layanan belum tersedia. Coba lagi.",
      response.status,
      payload?.code || "request_failed",
    );
  return payload.data;
}
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Terjadi kesalahan. Coba lagi.";
}
