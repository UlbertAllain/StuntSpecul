import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.env.VERCEL_ENV === "production") {
  console.log(
    "[vercel-build] Applying/verifying production database migrations...",
  );
  run(process.execPath, ["scripts/migrate.mjs"]);
} else {
  console.log(
    `[vercel-build] Skip production migration for VERCEL_ENV=${process.env.VERCEL_ENV || "local"}.`,
  );
}

run(process.execPath, ["node_modules/next/dist/bin/next", "build"]);
