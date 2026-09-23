import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Camera,
  ChartNoAxesCombined,
  ChevronDown,
  Heart,
  Home,
  Menu,
  Play,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  UserRoundPlus,
} from "lucide-react";

import "./landing.css";

const STEPS = [
  {
    icon: UserRoundPlus,
    title: "Buat akun",
    text: "Daftarkan akun orang tua dan profil anak untuk memulai pemeriksaan.",
  },
  {
    icon: Camera,
    title: "Lakukan skrining",
    text: "Ikuti pemeriksaan tinggi, berat, dan wajah melalui alat StuntSpecula.",
  },
  {
    icon: BarChart3,
    title: "Lihat hasil",
    text: "Hasil pertumbuhan dan riwayat pemeriksaan tampil langsung di akun.",
  },
] as const;

const FAQS = [
  {
    question: "Apa itu StuntSpecula?",
    answer:
      "StuntSpecula adalah sistem skrining pertumbuhan anak yang membantu orang tua dan petugas memantau tinggi, berat, TB/U WHO, serta informasi pendukung dari analisis wajah.",
  },
  {
    question: "Bagaimana hasil pertumbuhan ditentukan?",
    answer:
      "Hasil utama menggunakan tinggi badan menurut umur atau TB/U WHO. Analisis wajah Model A hanya menjadi informasi pendukung dan tidak menentukan status stunting.",
  },
  {
    question: "Siapa yang memulai pemeriksaan?",
    answer:
      "Orang tua memulai sesi dari akun mereka, kemudian anak mengikuti proses pemeriksaan pada alat StuntSpecula.",
  },
  {
    question: "Apakah hasil pemeriksaan tersimpan?",
    answer:
      "Ya. Hasil yang sudah selesai tersimpan di akun orang tua sehingga perkembangan anak dapat dilihat kembali dari riwayat.",
  },
] as const;

function ParentAppPreview() {
  return (
    <div className="stunt-real-phone" aria-label="Preview portal orang tua">
      <div className="stunt-real-phone-status">
        <span>9:41</span>
        <span>● ● ●</span>
      </div>

      <div className="stunt-real-phone-screen">
        <div className="stunt-real-phone-head">
          <div>
            <span>RUANG ORANG TUA</span>
            <strong>Halo, Noell!</strong>
          </div>
          <span className="stunt-real-avatar">N</span>
        </div>

        <section className="stunt-real-growth-card">
          <div className="stunt-real-growth-head">
            <div>
              <small>PROFIL PERTUMBUHAN</small>
              <strong>Elsa</strong>
              <span>3 tahun 3 bulan · Laki-laki</span>
            </div>
            <span className="stunt-real-child-avatar">E</span>
          </div>

          <div className="stunt-real-chart">
            <svg viewBox="0 0 240 94" preserveAspectRatio="none">
              <defs>
                <linearGradient id="hero-chart" x1="0" x2="1">
                  <stop offset="0%" stopColor="#72b8e6" />
                  <stop offset="100%" stopColor="#ff9fc3" />
                </linearGradient>
              </defs>
              <path d="M6 78 C42 73 61 62 88 58 S145 42 174 34 S210 24 234 13" />
            </svg>
            <span>Perkembangan tinggi badan</span>
          </div>

          <div className="stunt-real-metrics">
            <article>
              <span>Tinggi</span>
              <strong>93.5</strong>
              <small>cm</small>
            </article>
            <article>
              <span>Berat</span>
              <strong>18.9</strong>
              <small>kg</small>
            </article>
            <article>
              <span>TB/U</span>
              <strong>Dalam rentang</strong>
            </article>
          </div>
        </section>

        <section className="stunt-real-summary">
          <div className="stunt-real-summary-title">
            <TrendingUp size={16} />
            <div>
              <strong>Ringkasan terbaru</strong>
              <span>Pemeriksaan 23/09/2026</span>
            </div>
          </div>
          <div className="stunt-real-summary-line">
            <span>Status pertumbuhan</span>
            <strong>Dalam rentang</strong>
          </div>
          <div className="stunt-real-summary-line">
            <span>Analisis wajah</span>
            <strong>Informasi pendukung</strong>
          </div>
        </section>

        <button className="stunt-real-assistant" aria-label="Asisten">
          <Image src="/images/mimo-cheer.png" alt="" width={96} height={96} />
        </button>
      </div>

      <nav className="stunt-real-bottom-nav" aria-label="Preview navigasi">
        <span className="active">
          <Home />
          <small>Beranda</small>
        </span>
        <span>
          <TrendingUp />
          <small>Insight</small>
        </span>
        <span className="start">
          <i>
            <Play />
          </i>
          <small>Mulai</small>
        </span>
        <span>
          <ChartNoAxesCombined />
          <small>Riwayat</small>
        </span>
        <span>
          <UserRound />
          <small>Profil</small>
        </span>
      </nav>
    </div>
  );
}

function GrowthPreview() {
  return (
    <div className="stunt-bento">
      <article className="stunt-bento-who">
        <span>HASIL PERTUMBUHAN WHO</span>
        <div>
          <strong>Dalam rentang</strong>
          <small>TB/U -1.42 SD</small>
        </div>
        <p>
          Hasil utama menggunakan tinggi badan menurut umur sesuai standar WHO.
        </p>
      </article>

      <article className="stunt-bento-metric stunt-bento-height">
        <span>Tinggi</span>
        <strong>93.5</strong>
        <small>cm</small>
      </article>

      <article className="stunt-bento-metric stunt-bento-weight">
        <span>Berat</span>
        <strong>18.9</strong>
        <small>kg</small>
      </article>

      <article className="stunt-bento-chart">
        <div className="stunt-bento-card-head">
          <div>
            <span>PERKEMBANGAN</span>
            <strong>Tinggi badan</strong>
          </div>
          <small>6 pemeriksaan</small>
        </div>
        <svg viewBox="0 0 320 130" preserveAspectRatio="none">
          <defs>
            <linearGradient id="bento-line" x1="0" x2="1">
              <stop offset="0%" stopColor="#72b8e6" />
              <stop offset="100%" stopColor="#e891b5" />
            </linearGradient>
            <linearGradient id="bento-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#72b8e6" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#72b8e6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            className="area"
            d="M8 112 C58 103 80 88 118 82 S184 61 226 49 S273 34 312 21 L312 124 L8 124 Z"
          />
          <path d="M8 112 C58 103 80 88 118 82 S184 61 226 49 S273 34 312 21" />
          <circle cx="8" cy="112" r="4" />
          <circle cx="118" cy="82" r="4" />
          <circle cx="226" cy="49" r="4" />
          <circle cx="312" cy="21" r="4" />
        </svg>
      </article>

      <article className="stunt-bento-history">
        <div className="stunt-bento-card-head">
          <div>
            <span>RIWAYAT TERBARU</span>
            <strong>23 Sep 2026</strong>
          </div>
          <small>Selesai</small>
        </div>
        <div className="stunt-bento-history-grid">
          <div>
            <span>Tinggi</span>
            <strong>93.5 cm</strong>
          </div>
          <div>
            <span>Berat</span>
            <strong>18.9 kg</strong>
          </div>
          <div>
            <span>Model A</span>
            <strong>Informasi pendukung</strong>
          </div>
        </div>
      </article>
    </div>
  );
}

export function PublicLanding() {
  return (
    <main className="stunt-landing">
      <header className="stunt-header">
        <div className="stunt-header-inner">
          <Link className="stunt-brand" href="/" aria-label="StuntSpecula">
            <Image
              src="/images/stuntspecula-logo.jpeg"
              alt="StuntSpecula"
              width={1536}
              height={1024}
              priority
            />
          </Link>

          <nav className="stunt-desktop-nav" aria-label="Navigasi utama">
            <a href="#beranda">Beranda</a>
            <a href="#preview">Fitur</a>
            <a href="#cara-kerja">Cara kerja</a>
            <a href="#faq">FAQ</a>
          </nav>

          <Link className="stunt-login-button" href="/login">
            Masuk / Daftar <ArrowRight size={17} />
          </Link>

          <details className="stunt-mobile-menu">
            <summary aria-label="Buka menu">
              <Menu />
            </summary>
            <div className="stunt-mobile-menu-panel">
              <Link className="stunt-mobile-menu-brand" href="/">
                <Image
                  src="/images/stuntspecula-logo.jpeg"
                  alt="StuntSpecula"
                  width={1536}
                  height={1024}
                />
              </Link>
              <a href="#beranda">Beranda</a>
              <a href="#preview">Fitur</a>
              <a href="#cara-kerja">Cara kerja</a>
              <a href="#faq">FAQ</a>
              <Link className="stunt-mobile-menu-login" href="/login">
                Masuk / Daftar <ArrowRight size={17} />
              </Link>
            </div>
          </details>
        </div>
      </header>

      <section id="beranda" className="stunt-hero">
        <div className="stunt-orb stunt-orb--blue" />
        <div className="stunt-orb stunt-orb--pink" />

        <div className="stunt-hero-inner">
          <div className="stunt-hero-copy">
            <span className="stunt-eyebrow">
              PANTAU · CEGAH · TUMBUH BERSAMA
            </span>
            <h1>
              Setiap Anak
              <br />
              Berhak Tumbuh
              <strong> Lebih Baik</strong>
            </h1>
            <p>
              StuntSpecula membantu orang tua memantau pertumbuhan anak sejak
              dini melalui proses skrining yang sederhana dan hasil yang mudah
              dibaca.
            </p>

            <div className="stunt-hero-actions">
              <Link className="stunt-primary-button" href="/login">
                Mulai Sekarang <ArrowRight size={18} />
              </Link>
              <a className="stunt-ghost-button" href="#cara-kerja">
                <PlayCircle size={19} />
                Lihat Cara Kerja
              </a>
            </div>

            <div className="stunt-hero-benefits">
              <div>
                <span className="stunt-benefit-icon stunt-benefit-icon--pink">
                  <Heart />
                </span>
                <p>Riwayat pertumbuhan tersimpan di akun orang tua</p>
              </div>
              <div>
                <span className="stunt-benefit-icon stunt-benefit-icon--blue">
                  <ShieldCheck />
                </span>
                <p>Hasil utama tetap berdasarkan standar TB/U WHO</p>
              </div>
              <div>
                <span className="stunt-benefit-icon stunt-benefit-icon--mint">
                  <Sparkles />
                </span>
                <p>Alur pemeriksaan sederhana dan mudah dibaca di HP</p>
              </div>
            </div>
          </div>

          <div className="stunt-hero-product">
            <span className="stunt-product-badge">PORTAL ORANG TUA</span>
            <ParentAppPreview />
            <Image
              src="/images/mimo-cheer.png"
              alt=""
              width={180}
              height={180}
              className="stunt-hero-mimo"
            />
          </div>
        </div>
      </section>

      <section id="preview" className="stunt-preview-section">
        <div className="stunt-section-copy">
          <span className="stunt-eyebrow stunt-eyebrow--pink">
            LANGSUNG TERBACA
          </span>
          <h2>Semua yang penting, langsung terlihat.</h2>
          <p>
            Hasil utama, perkembangan tinggi dan berat, serta riwayat
            pemeriksaan disusun dalam satu tampilan yang mudah dipindai.
          </p>
        </div>
        <GrowthPreview />
      </section>

      <section id="cara-kerja" className="stunt-steps-section">
        <div className="stunt-section-copy">
          <span className="stunt-eyebrow">CARA KERJA</span>
          <h2>Tiga langkah mudah untuk mulai.</h2>
          <p>
            Pemeriksaan dibuat ringkas agar orang tua dapat mengikuti alurnya
            langsung dari HP.
          </p>
        </div>

        <div className="stunt-step-list">
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <div className="stunt-step-wrap" key={title}>
              <article className="stunt-step-card">
                <span className="stunt-step-number">{index + 1}</span>
                <span className="stunt-step-icon">
                  <Icon />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
              {index < STEPS.length - 1 && (
                <span className="stunt-step-arrow" aria-hidden="true">
                  ↓
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="stunt-faq-section">
        <div className="stunt-section-copy">
          <span className="stunt-eyebrow">PERTANYAAN YANG SERING DIAJUKAN</span>
          <h2>FAQ</h2>
        </div>

        <div className="stunt-faq-layout">
          <div className="stunt-faq-list">
            {FAQS.map((item, index) => (
              <details
                className="stunt-faq-item"
                key={item.question}
                open={index === 0}
              >
                <summary>
                  <span>{item.question}</span>
                  <ChevronDown />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>

          <aside className="stunt-cta-card">
            <span className="stunt-eyebrow stunt-eyebrow--pink">
              BERSAMA CEGAH STUNTING
            </span>
            <h2>
              Mulai pantau tumbuh kembang anak bersama
              <strong> StuntSpecula</strong>
            </h2>
            <p>
              Mulai dari satu akun orang tua, jalankan pemeriksaan, lalu pantau
              hasilnya dari waktu ke waktu.
            </p>
            <Image
              src="/images/mimo-cheer.png"
              alt="Mimo, maskot StuntSpecula"
              width={600}
              height={600}
              className="stunt-cta-mimo"
            />
            <Link
              className="stunt-primary-button stunt-cta-button"
              href="/login"
            >
              Daftar Sekarang <ArrowRight size={18} />
            </Link>
          </aside>
        </div>
      </section>

      <footer className="stunt-footer">
        <div className="stunt-footer-brand">
          <Image
            src="/images/stuntspecula-logo.jpeg"
            alt="StuntSpecula"
            width={1536}
            height={1024}
          />
          <p>
            Pantau pertumbuhan anak dengan alur yang sederhana dan mudah dibaca.
          </p>
        </div>

        <nav className="stunt-footer-links" aria-label="Navigasi footer">
          <a href="#preview">Fitur</a>
          <a href="#cara-kerja">Cara kerja</a>
          <a href="#faq">FAQ</a>
          <Link href="/login">Masuk</Link>
        </nav>

        <div className="stunt-footer-social" aria-label="Media sosial">
          <span aria-label="Instagram">IG</span>
          <span aria-label="YouTube">YT</span>
          <span aria-label="LinkedIn">in</span>
        </div>

        <p className="stunt-footer-copy">
          © 2026 StuntSpecula. Semua hak dilindungi.
        </p>
      </footer>
    </main>
  );
}
