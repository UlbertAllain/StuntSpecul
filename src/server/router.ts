import type { Env } from "./env";
import { ApiError, ok, sameOrigin } from "./http";
import * as auth from "./auth";
import * as children from "./children";
import * as screening from "./screenings";
import * as access from "./access";
import * as guest from "./guest-screening";
import * as monitoring from "./monitoring";
import { chat } from "./ai";
import { idSchema } from "./security";

export async function route(request: Request, env: Env): Promise<Response> {
  sameOrigin(request, env);
  const path = new URL(request.url).pathname.replace(/\/$/, "");
  const method = request.method;
  const key = `${method} ${path}`;
  switch (key) {
    case "GET /api/config":
      return auth.authConfig(request, env);
    case "POST /api/auth/setup":
      return auth.setup(request, env);
    case "POST /api/auth/login":
      return auth.login(request, env);
    case "POST /api/auth/logout":
      return auth.logout(request, env);
    case "GET /api/auth/me":
      return ok(await auth.requireStaff(request, env));
    case "GET /api/staff":
      return auth.listStaff(request, env);
    case "POST /api/staff":
      return auth.createStaff(request, env);
    case "GET /api/monitoring":
      return monitoring.monitoringOverview(request, env);
    case "GET /api/children":
      return children.listChildren(request, env);
    case "POST /api/children":
      return children.createChild(request, env);
    case "GET /api/examinations":
      return screening.listExaminations(request, env);
    case "POST /api/examinations":
      return screening.startExamination(request, env);
    case "GET /api/mirror/assignment":
      return screening.mirrorAssignment(request, env);
    case "POST /api/screening/session":
      return guest.createScreeningSession(request, env);
    case "GET /api/screening/mirror":
      return guest.mirrorState(request, env);
    case "POST /api/screening/mirror/claim":
      return guest.claimGuestExamination(request, env);
    case "POST /api/screening/mirror/complete":
      return guest.completeGuestExamination(request, env);
    case "POST /api/screening/mirror/cancel":
      return guest.cancelGuestExamination(request, env);
    case "POST /api/screening/parent/exchange":
      return guest.exchangeParentScreening(request, env);
    case "GET /api/screening/parent":
      return guest.parentScreeningState(request, env);
    case "POST /api/screening/parent/profile":
      return guest.submitParentProfile(request, env);
    case "POST /api/screening/parent/finalize":
      return guest.finalizeParentResult(request, env);
    case "POST /api/parent/exchange":
      return access.exchangeResultLink(request, env);
    case "GET /api/parent/result":
      return access.parentResult(request, env);
    case "POST /api/parent/logout":
      return access.parentLogout(request, env);
    case "POST /api/parent/chat":
      return chat(request, env);
  }
  const match = path.match(
    /^\/api\/(staff|examinations|mirror\/examinations)\/([^/]+)(?:\/(access|claim|complete|cancel))?$/,
  );
  if (match) {
    const [, resource, rawId, action] = match;
    const parsed = idSchema.safeParse(rawId);
    if (!parsed.success) throw new ApiError(404, "Halaman tidak ditemukan.");
    const id = parsed.data;
    if (resource === "staff" && method === "PATCH" && !action)
      return auth.setStaffActive(request, env, id);
    if (resource === "examinations") {
      if (method === "GET" && !action) {
        await auth.requireStaff(request, env);
        return ok(await screening.getExamination(env, id));
      }
      if (method === "DELETE" && !action)
        return screening.cancelExamination(request, env, id);
      if (method === "POST" && action === "access")
        return access.createResultLink(request, env, id);
      if (method === "DELETE" && action === "access")
        return access.revokeResultLinks(request, env, id);
    }
    if (resource === "mirror/examinations" && method === "POST") {
      if (action === "claim")
        return screening.claimExamination(request, env, id);
      if (action === "complete")
        return screening.completeExamination(request, env, id);
      if (action === "cancel")
        return screening.cancelFromMirror(request, env, id);
    }
  }
  throw new ApiError(404, "Layanan tidak ditemukan.");
}
