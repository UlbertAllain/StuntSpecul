import type { Env } from "./env";
import { ApiError, ok } from "./http";
import * as auth from "./auth";
import * as parentAccount from "./parent-account";

type SuccessPayload<T> = {
  success: true;
  data: T;
};

function setCookie(response: Response) {
  const cookie = response.headers.get("set-cookie");
  return cookie ? { "Set-Cookie": cookie } : undefined;
}

export async function unifiedLogin(request: Request, env: Env) {
  try {
    const response = await auth.login(request.clone(), env);
    const payload = (await response.json()) as SuccessPayload<{
      id: string;
      name: string;
      email: string;
      role: "admin" | "staff";
    }>;

    return ok(
      {
        role: payload.data.role,
        name: payload.data.name,
        redirectTo: payload.data.role === "admin" ? "/admin" : "/petugas",
      },
      200,
      setCookie(response),
    );
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
  }

  try {
    const response = await parentAccount.loginParent(request.clone(), env);
    const payload = (await response.json()) as SuccessPayload<{
      id: string;
      name: string;
      email: string;
    }>;

    return ok(
      {
        role: "parent" as const,
        name: payload.data.name,
        redirectTo: "/ortu",
      },
      200,
      setCookie(response),
    );
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
  }

  throw new ApiError(401, "Email atau password tidak sesuai.");
}
