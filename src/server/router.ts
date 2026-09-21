import type { Env } from "./env";
import { ApiError, ok, sameOrigin } from "./http";
import * as auth from "./auth";
import * as children from "./children";
import * as screening from "./screenings";
import * as access from "./access";
import * as guest from "./guest-screening";
import * as monitoring from "./monitoring";
import * as parentAccount from "./parent-account";
import * as station from "./station";
import { health } from "./health";
import { chat } from "./ai";
import { idSchema } from "./security";

export async function route(request: Request, env: Env): Promise<Response> {
  sameOrigin(request, env);
  const path = new URL(request.url).pathname.replace(/\/$/, "");
  const method = request.method;
  const key = `${method} ${path}`;
  switch (key) {
    case "GET /api/health":
      return health(env);
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
    case "GET /api/device-monitoring":
      return monitoring.deviceMonitoring(request, env);
    case "GET /api/insights":
      return monitoring.adminInsights(request, env);
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
    case "GET /api/station/active":
      return station.stationStatus(request, env);
    case "POST /api/station/claim":
      return station.claimStationExamination(request, env);
    case "POST /api/station/complete":
      return station.completeStationExamination(request, env);
    case "POST /api/station/cancel":
      return station.cancelStationExamination(request, env);

    case "POST /api/parent-account/register":
      return parentAccount.registerParent(request, env);
    case "POST /api/parent-account/login":
      return parentAccount.loginParent(request, env);
    case "POST /api/parent-account/logout":
      return parentAccount.logoutParent(request, env);
    case "GET /api/parent-account/me":
      return parentAccount.parentAccountView(request, env);
    case "GET /api/parent-account/messages":
      return parentAccount.parentAccountMessages(request, env);
    case "POST /api/parent-account/chat":
      return parentAccount.parentAccountChat(request, env);
    case "POST /api/parent-account/examinations":
      return parentAccount.startParentExamination(request, env);

    // Legacy guest-screening flow is retained as a fallback for events/demo use.
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
  const parentExamMatch = path.match(
    /^\/api\/parent-account\/examinations\/([^/]+)\/(finalize|cancel)$/,
  );
  if (parentExamMatch && method === "POST") {
    const [, rawId, action] = parentExamMatch;
    const parsed = idSchema.safeParse(rawId);
    if (!parsed.success) throw new ApiError(404, "Halaman tidak ditemukan.");
    if (action === "finalize")
      return parentAccount.finalizeParentExamination(request, env, parsed.data);
    if (action === "cancel")
      return parentAccount.cancelParentExamination(request, env, parsed.data);
  }

  const match = path.match(
    /^\/api\/(staff|examinations|mirror\/examinations)\/([^/]+)(?:\/(access|claim|complete|cancel|finalize))?$/,
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
      if (method === "POST" && action === "finalize")
        return screening.finalizeExamination(request, env, id);
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
