import { failure } from "@/server/http";
import { route } from "@/server/router";
import { runtimeEnvironment } from "@/server/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(request: Request): Promise<Response> {
  try {
    return await route(request, runtimeEnvironment(request));
  } catch (error) {
    return failure(error);
  }
}

export {
  handle as GET,
  handle as POST,
  handle as PATCH,
  handle as DELETE,
  handle as PUT,
  handle as OPTIONS,
};
