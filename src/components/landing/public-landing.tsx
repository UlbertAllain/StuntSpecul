import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  HeartPulse,
  History,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

const STEPS = [
  {
    icon: UsersRound,
    title: "Pilih profil anak",
    text: "Orang tua memilih anak dari akun yang sudah terdaftar.",
  },
  {
    icon: HeartPulse,
    title: "Lakukan pemeriksaan",
    text: "Tinggi, berat, dan wajah diproses melalui alat StuntSpecula.",
  },
  {
    icon: BarChart3,
    title: "Lihat hasil",
    text: "TB/U WHO menjadi hasil utama dan Model A menjadi informasi pendukung.",
  },
] as const;

export function PublicLanding() {
  return (
    <main className="public-ref-page">
      <header className="public-ref-header">
        <div className="public-ref-header-inner">
          <Link href="/" aria-label="StuntSpecula">
            <Image
              src="/images/stuntspecula-logo.jpeg"
              alt="StuntSpecula"
              width={1536}
              height={1024}
              priority
            />
          </Link>

          <nav aria-label="Navigasi utama">
            <a href="#cara-kerja">Cara kerja</a>
            <a href="#fitur">Fitur</a>
            <a href="#tentang">Tentang</a>
          </nav>

          <Link className="public-ref-login" href="/login">
            Masuk <ArrowRight size={17} />
          </Link>
        </div>
      </header>

      <section className="public-ref-hero">
        <div className="public-ref-glow public-ref-glow-blue" />
        <div className="public-ref-glow public-ref-glow-pink" />

        <div className="public-ref-hero-inner">
          <div className="public-ref-copy">
            <span className="public-ref-eyebrow">
              CHILD GROWTH TRACKING & PREVENTION
            </span>
            <h1>
              Pantau tumbuh kembang anak
              <span> lebih mudah dari satu tempat.</span>
            </h1>
            <p>
              StuntSpecula membantu orang tua dan petugas menjalankan skrining
              pertumbuhan anak dengan alur yang sederhana, hasil yang mudah
              dibaca, dan riwayat yang tersimpan rapi.
            </p>
            <a className="public-ref-secondary" href="#cara-kerja">
              Lihat cara kerja <ArrowRight size={17} />
            </a>
          </div>

          <div className="public-ref-phone-card">
            <div className="public-ref-phone-top">
              <span>Ringkasan pertumbuhan</span>
              <span className="public-ref-avatar">A</span>
            </div>
            <div className="public-ref-chart" aria-hidden="true">
              <svg viewBox="0 0 320 150" preserveAspectRatio="none">
                <path d="M8 126 C65 112 96 95 135 82 S205 62 312 28" />
              </svg>
            </div>
            <div className="public-ref-metrics">
              <article>
                <small>Tinggi</small>
                <strong>95.4</strong>
                <span>cm</span>
              </article>
              <article>
                <small>Berat</small>
                <strong>14.2</strong>
                <span>kg</span>
              </article>
              <article>
                <small>TB/U</small>
                <strong>Normal</strong>
                <span>WHO</span>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section id="cara-kerja" className="public-ref-section">
        <div className="public-ref-section-head">
          <span>CARA KERJA</span>
          <h2>Tiga langkah, tanpa alur yang berbelit.</h2>
          <p>
            Pemeriksaan dibuat langsung dan mudah dipahami baik dari HP orang
            tua maupun dashboard petugas.
          </p>
        </div>

        <div className="public-ref-step-grid">
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <article key={title}>
              <span className="public-ref-step-number">0{index + 1}</span>
              <span className="public-ref-step-icon">
                <Icon />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="fitur" className="public-ref-feature-wrap">
        <div className="public-ref-feature-card">
          <div>
            <span className="public-ref-eyebrow">UNTUK ORANG TUA</span>
            <h2>Riwayat anak langsung terbaca.</h2>
            <p>
              Tinggi, berat, TB/U, insight, dan hasil pendukung ditampilkan
              tanpa perlu masuk ke banyak halaman detail.
            </p>
          </div>
          <div className="public-ref-feature-list">
            <div>
              <History />
              <span>Riwayat pemeriksaan tersimpan</span>
            </div>
            <div>
              <BarChart3 />
              <span>Perkembangan mudah dibaca</span>
            </div>
            <div>
              <CheckCircle2 />
              <span>Hasil utama tetap berdasarkan WHO</span>
            </div>
          </div>
        </div>

        <div className="public-ref-feature-card public-ref-feature-card-pink">
          <div>
            <span className="public-ref-eyebrow">UNTUK PETUGAS</span>
            <h2>Operasional tetap sederhana.</h2>
            <p>
              Petugas fokus pada data anak, pemeriksaan, riwayat, dan insight.
              Monitoring alat serta pengelolaan petugas hanya tersedia untuk
              admin.
            </p>
          </div>
          <div className="public-ref-feature-list">
            <div>
              <UsersRound />
              <span>Data anak langsung terlihat</span>
            </div>
            <div>
              <HeartPulse />
              <span>Status pemeriksaan terpantau</span>
            </div>
            <div>
              <ShieldCheck />
              <span>Akses dibatasi sesuai role</span>
            </div>
          </div>
        </div>
      </section>

      <section id="tentang" className="public-ref-note">
        <ShieldCheck />
        <div>
          <h2>Skrining, bukan diagnosis medis.</h2>
          <p>
            TB/U WHO tetap menjadi dasar hasil pertumbuhan. Analisis wajah hanya
            berfungsi sebagai informasi pendukung dan tidak menggantikan
            pemeriksaan tenaga kesehatan.
          </p>
        </div>
      </section>

      <footer className="public-ref-footer">
        <span>StuntSpecula</span>
        <span>Child Growth Tracking & Prevention</span>
      </footer>
    </main>
  );
}
