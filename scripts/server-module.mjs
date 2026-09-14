import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadEnvFile } from "node:process";

export function loadEnvironment() {
  for (const path of [".env.local", ".env"]) {
    try {
      loadEnvFile(path);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

export async function withServerModule(source, action) {
  const directory = await mkdtemp(join(tmpdir(), "stuntspecula-"));
  try {
    const entrypoint = join(directory, "module.mjs");
    await build({
      entryPoints: [source],
      outfile: entrypoint,
      bundle: true,
      format: "esm",
      platform: "node",
    });
    return await action(await import(pathToFileURL(entrypoint)));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
