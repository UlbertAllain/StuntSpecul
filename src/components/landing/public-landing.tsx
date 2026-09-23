import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Camera,
  ChevronDown,
  Heart,
  Menu,
  PlayCircle,
  ShieldCheck,
  Sparkles,
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

function AppPhone({ variant }: { variant: "growth" | "scan" | "assistant" }) {
  if (variant === "scan") {
    return (
      <div className="stunt-phone stunt-phone--scan" aria-hidden="true">
        <div className="stunt-phone-notch" />
        <div className="stunt-phone-bar">
          <span>‹</span>
          <strong>Growth Scan</strong>
          <span>◉</span>
        </div>
        <div className="stunt-scan-area">
          <span className="stunt-scan-corner stunt-scan-corner--a" />
          <span className="stunt-scan-corner stunt-scan-corner--b" />
          <span className="stunt-scan-corner stunt-scan-corner--c" />
          <span className="stunt-scan-corner stunt-scan-corner--d" />
          <div className="stunt-child-silhouette">
            <span className="stunt-child-head" />
            <span className="stunt-child-body" />
          </div>
        </div>
        <span className="stunt-phone-action">Ambil gambar</span>
        <span className="stunt-phone-secondary">Kalibrasi tinggi</span>
      </div>
    );
  }

  if (variant === "assistant") {
    return (
      <div className="stunt-phone stunt-phone--assistant" aria-hidden="true">
        <div className="stunt-phone-notch" />
        <div className="stunt-phone-bar">
          <span>‹</span>
          <strong>Asisten</strong>
          <span>•••</span>
        </div>
        <div className="stunt-chat">
          <div className="stunt-chat-bubble stunt-chat-bubble--bot">
            Hai! Aku bantu jelaskan hasil pemeriksaan anak dengan bahasa yang
            mudah dipahami.
          </div>
          <div className="stunt-chat-bubble stunt-chat-bubble--user">
            Bagaimana hasil pertumbuhannya?
          </div>
          <div className="stunt-chat-bubble stunt-chat-bubble--bot">
            Hasil utama tetap mengikuti TB/U WHO. Riwayatnya bisa dipantau dari
            akun orang tua.
          </div>
        </div>
        <div className="stunt-chat-input">Ketik pesan…</div>
      </div>
    );
  }

  return (
    <div className="stunt-phone stunt-phone--growth" aria-hidden="true">
      <div className="stunt-phone-notch" />
      <div className="stunt-phone-bar">
        <span>☰</span>
        <strong>Halo, Orang Tua!</strong>
        <span>◌</span>
      </div>
      <div className="stunt-profile-preview">
        <small>PROFIL PERTUMBUHAN</small>
        <strong>Elsa</strong>
        <span>3 tahun 3 bulan</span>
      </div>
      <div className="stunt-mini-chart">
        <svg viewBox="0 0 200 90" preserveAspectRatio="none">
          <path d="M5 78 C36 70 54 58 80 55 S132 37 195 16" />
        </svg>
      </div>
      <div className="stunt-mini-metrics">
        <span>
          <small>Tinggi</small>
          <b>93.5</b>
        </span>
        <span>
          <small>Berat</small>
          <b>18.9</b>
        </span>
        <span>
          <small>TB/U</small>
          <b>Pantau</b>
        </span>
      </div>
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
              <a className="stunt-ghost-button" href="#preview">
                <PlayCircle size={19} />
                Lihat Tampilan
              </a>
            </div>

            <div className="stunt-hero-benefits">
              <div>
                <span className="stunt-benefit-icon stunt-benefit-icon--pink">
                  <Heart />
                </span>
                <p>Untuk masa depan tumbuh kembang anak yang lebih sehat</p>
              </div>
              <div>
                <span className="stunt-benefit-icon stunt-benefit-icon--blue">
                  <ShieldCheck />
                </span>
                <p>Hasil pertumbuhan utama berdasarkan standar WHO</p>
              </div>
              <div>
                <span className="stunt-benefit-icon stunt-benefit-icon--mint">
                  <Sparkles />
                </span>
                <p>Alur pemeriksaan dibuat sederhana untuk penggunaan harian</p>
              </div>
            </div>
          </div>

          <div className="stunt-hero-visual" aria-label="Preview aplikasi">
            <span className="stunt-float-label stunt-float-label--one">
              Pantau pertumbuhan
            </span>
            <span className="stunt-float-label stunt-float-label--two">
              Skrining mudah
            </span>
            <span className="stunt-float-label stunt-float-label--three">
              Hasil tersimpan
            </span>
            <div className="stunt-phone-stack">
              <div className="stunt-phone-wrap stunt-phone-wrap--left">
                <AppPhone variant="growth" />
              </div>
              <div className="stunt-phone-wrap stunt-phone-wrap--center">
                <AppPhone variant="scan" />
              </div>
              <div className="stunt-phone-wrap stunt-phone-wrap--right">
                <AppPhone variant="assistant" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="preview" className="stunt-preview-section">
        <div className="stunt-section-copy">
          <span className="stunt-eyebrow stunt-eyebrow--pink">
            SEKILAS APLIKASI
          </span>
          <h2>Pemantauan pertumbuhan yang mudah dibaca.</h2>
          <p>
            Dari hasil skrining sampai riwayat pertumbuhan, informasi utama
            ditampilkan langsung tanpa alur yang berbelit.
          </p>
        </div>

        <div className="stunt-preview-stage">
          <div className="stunt-preview-phone stunt-preview-phone--one">
            <AppPhone variant="growth" />
          </div>
          <div className="stunt-preview-phone stunt-preview-phone--two">
            <AppPhone variant="scan" />
          </div>
          <div className="stunt-preview-phone stunt-preview-phone--three">
            <AppPhone variant="assistant" />
          </div>
        </div>
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
