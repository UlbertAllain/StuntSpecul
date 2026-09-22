import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const requiredFirebase = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
];

if (process.env.VERCEL_ENV === "production") {
  const missing = requiredFirebase.filter((name) => !process.env[name]?.trim());

  if (missing.length) {
    console.error(
      `[vercel-build] Missing Firebase environment variables: ${missing.join(", ")}`,
    );
    process.exit(1);
  }

  console.log(
    "[vercel-build] Firestore is the production database. No SQL migration is required.",
  );
}

run(process.execPath, ["node_modules/next/dist/bin/next", "build"]);
