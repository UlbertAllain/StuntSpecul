import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
await mkdir("out", { recursive: true });
const children = [];
function start(file, args) {
  const child = spawn(process.execPath, [file, ...args], { stdio: "inherit" });
  children.push(child);
  return child;
}
function stop() {
  for (const child of children) child.kill();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
const migration = start("node_modules/wrangler/bin/wrangler.js", [
  "d1",
  "migrations",
  "apply",
  "DB",
  "--local",
]);
migration.on("exit", (code) => {
  if (code !== 0) {
    process.exitCode = code || 1;
    return;
  }
  const api = start("node_modules/wrangler/bin/wrangler.js", [
    "dev",
    "--port",
    "8787",
  ]);
  const next = start("node_modules/next/dist/bin/next", ["dev"]);
  api.on("exit", () => next.kill());
  next.on("exit", () => api.kill());
});
