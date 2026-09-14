import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import "./portal.css";

export function PortalShell({
  children,
  heading,
  subtitle,
  actions,
}: {
  children: ReactNode;
  heading: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="portal-shell">
      <header className="portal-header">
        <Link href="/" aria-label="StuntSpecula">
          <Image
            src="/images/stuntspecula-logo.jpeg"
            alt="StuntSpecula"
            width={1536}
            height={1024}
          />
        </Link>
        <div>{actions}</div>
      </header>
      <main className="portal-main">
        <div className="portal-title">
          <span>STUNTSPECULA</span>
          <h1>{heading}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {children}
      </main>
      <footer className="portal-footer">
        StuntSpecula · Teman tumbuh si kecil
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
