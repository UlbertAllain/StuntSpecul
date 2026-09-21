import test from "node:test";
import assert from "node:assert/strict";
import {
  acceptedMigrationChecksums,
  migrationChecksum,
} from "../scripts/migration-checksum.mjs";

test("migration checksums are stable across LF and CRLF checkouts", () => {
  const lf = "CREATE TABLE sample (id TEXT);\n--> statement-breakpoint\nSELECT 1;\n";
  const crlf = lf.replace(/\n/g, "\r\n");

  assert.equal(migrationChecksum(lf), migrationChecksum(crlf));
  assert.equal(acceptedMigrationChecksums(lf).has(migrationChecksum(crlf)), true);
  assert.equal(acceptedMigrationChecksums(crlf).has(migrationChecksum(lf)), true);
});

test("migration checksum compatibility still rejects SQL content changes", () => {
  const original = "SELECT 1;\n";
  const changed = "SELECT 2;\n";

  assert.equal(
    acceptedMigrationChecksums(changed).has(migrationChecksum(original)),
    false,
  );
});
