import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type PortalTone = "neutral" | "parent" | "staff";

export function PortalShell({
  children,
  heading,
  subtitle,
  actions,
  tone = "neutral",
}: {
  children: ReactNode;
  heading: string;
  subtitle?: string;
  actions?: ReactNode;
  tone?: PortalTone;
}) {
  return (
    <div className={`portal-shell portal-shell--${tone}`}>
      <header className="portal-header">
        <Link href="/" aria-label="StuntSpecula" className="portal-brand">
          <Image
            src="/images/stuntspecula-logo.jpeg"
            alt="StuntSpecula"
            width={1536}
            height={1024}
            priority
          />
        </Link>
        <div className="portal-header-actions">{actions}</div>
      </header>

      <main className="portal-main">
        <div className="portal-title">
          <span>
            {tone === "parent"
              ? "RUANG ORANG TUA"
              : tone === "staff"
                ? "RUANG PETUGAS"
                : "STUNTSPECULA"}
          </span>
          <h1>{heading}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {children}
      </main>

      <footer className="portal-footer">
        <span>StuntSpecula · Teman tumbuh si kecil</span>
        <span>Screening bukan diagnosis medis.</span>
      </footer>
    </div>
  );
}

export function Message({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <p
      className={`portal-message ${error ? "error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
