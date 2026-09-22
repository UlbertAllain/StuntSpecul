import type { Metadata } from "next";

import "./globals.css";
import "../components/portal/portal.css";

export const metadata: Metadata = {
  icons: { icon: "/favicon.svg" },
  title: "StuntSpecula — Screening Pertumbuhan Anak",
  description:
    "Smart mirror untuk screening pertumbuhan: usia, jenis kelamin, tinggi, berat, serta facial analysis. Pemeriksaan interaktif bersama Mimo.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
