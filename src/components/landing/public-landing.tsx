import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Baby,
  BarChart3,
  Building2,
  Camera,
  Check,
  ChevronRight,
  ClipboardCheck,
  HeartPulse,
  LineChart,
  MonitorSmartphone,
  Ruler,
  Scale,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  UserRoundCheck,
  Wifi,
} from "lucide-react";

const CHECKS = [
  {
    icon: Ruler,
    title: "Tinggi badan",
    text: "Tinggi badan menjadi dasar pemantauan TB/U pada anak usia 24–59 bulan.",
    accent: "bg-[#e8f4ff] text-[#2f6f9f]",
  },
  {
    icon: Scale,
    title: "Berat badan",
    text: "Berat disimpan bersama pemeriksaan agar perubahan dapat dilihat dari waktu ke waktu.",
    accent: "bg-[#fff0f6] text-[#a43f6a]",
  },
  {
    icon: Camera,
    title: "Tahap kamera",
    text: "Kamera digunakan untuk alur pemeriksaan visual pendukung, bukan untuk mengenali identitas anak.",
    accent: "bg-[#edf8f2] text-[#39765f]",
  },
] as const;

const FLOW = [
  {
    number: "01",
    title: "Petugas memilih anak",
    text: "Profil anak dipilih dari dashboard fasilitas kesehatan sebelum pemeriksaan dimulai.",
  },
  {
    number: "02",
    title: "Anak mengikuti Mimo",
    text: "Layar alat memandu anak melalui tinggi, berat, dan tahap kamera dengan instruksi sederhana.",
  },
  {
    number: "03",
    title: "Hasil tersimpan otomatis",
    text: "Data pemeriksaan disimpan dan TB/U dihitung oleh engine pertumbuhan yang deterministik.",
  },
  {
    number: "04",
    title: "Orang tua memantau",
    text: "Hasil terbaru, riwayat, grafik perkembangan, dan tindak lanjut tersedia dari akun orang tua.",
  },
] as const;

const ROLES = [
  {
    icon: Building2,
    eyebrow: "PUSKESMAS",
    title: "Operasional tetap di petugas",
    text: "Petugas memilih anak, memulai pemeriksaan, menutup sesi, memantau perangkat, dan melihat insight fasilitas.",
  },
  {
    icon: HeartPulse,
    eyebrow: "ALAT STUNTSPECULA",
    title: "Pengalaman pemeriksaan untuk anak",
    text: "Layar portrait fokus pada instruksi sederhana, Mimo, dan tahapan pemeriksaan tanpa mengekspos identitas anak.",
  },
  {
    icon: Smartphone,
    eyebrow: "ORANG TUA",
    title: "Monitoring tanpa mengubah hasil",
    text: "Orang tua melihat perkembangan, riwayat, grafik, tindak lanjut, dan penjelasan hasil dari akun sendiri.",
  },
] as const;

const BENEFITS = [
  "Satu profil anak untuk riwayat pemeriksaan berulang",
  "Status alat terlihat tanpa harus mengecek layar satu per satu",
  "Hasil screening tidak berhenti di alat setelah pemeriksaan selesai",
  "Orang tua melihat perubahan antar pemeriksaan, bukan hanya satu angka",
] as const;

function ParentPreview() {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-[#dce8f1] bg-white shadow-[0_28px_80px_rgba(40,91,130,.12)]">
      <div className="flex items-center justify-between border-b border-[#e3edf4] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e6f3fc] text-[#2f6f9f]">
            <Baby size={20} />
          </span>
          <div>
            <strong className="block text-sm">Perkembangan anak</strong>
            <span className="text-xs text-[#718291]">Portal orang tua</span>
          </div>
        </div>
        <span className="rounded-full bg-[#eef8f2] px-3 py-1.5 text-[10px] font-black tracking-[0.08em] text-[#39765f]">
          TERHUBUNG
        </span>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-3">
        {[
          ["94.2 cm", "+1.8 cm", "Tinggi terakhir"],
          ["13.8 kg", "+0.6 kg", "Berat terakhir"],
          ["-1.42 SD", "TB/U", "Status terbaru"],
        ].map(([value, change, label]) => (
          <div
            key={label}
            className="rounded-2xl border border-[#e4edf4] bg-[#fbfdff] p-4"
          >
            <span className="text-[10px] font-extrabold tracking-[0.08em] text-[#788997]">
              {label.toUpperCase()}
            </span>
            <strong className="mt-2 block text-lg font-black text-[#17324d]">
              {value}
            </strong>
            <span className="mt-1 block text-xs font-bold text-[#39765f]">
              {change}
            </span>
          </div>
        ))}
      </div>

      <div className="px-5 pb-5">
        <div className="rounded-2xl border border-[#e0ebf3] bg-[linear-gradient(180deg,#f8fbfe,#ffffff)] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <strong className="block text-sm">Grafik TB/U</strong>
              <span className="mt-1 block text-xs text-[#728390]">
                Riwayat pemeriksaan terakhir
              </span>
            </div>
            <LineChart size={20} className="text-[#c24c7e]" />
          </div>
          <svg
            className="mt-4 h-32 w-full text-[#2f6f9f]"
            viewBox="0 0 420 130"
            role="img"
            aria-label="Contoh grafik perkembangan TB/U"
          >
            {[28, 61, 94].map((y) => (
              <line
                key={y}
                x1="16"
                x2="404"
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.08"
                strokeDasharray="5 7"
              />
            ))}
            <line
              x1="16"
              x2="404"
              y1="97"
              y2="97"
              stroke="#c24c7e"
              strokeOpacity="0.28"
              strokeDasharray="7 6"
            />
            <polyline
              points="22,90 112,78 204,70 302,55 398,48"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {[
              [22, 90],
              [112, 78],
              [204, 70],
              [302, 55],
              [398, 48],
            ].map(([x, y]) => (
              <circle
                key={`${x}-${y}`}
                cx={x}
                cy={y}
                r="6"
                fill="white"
                stroke="currentColor"
                strokeWidth="4"
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

function StaffPreview() {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-[#dce8f1] bg-[#17324d] text-white shadow-[0_28px_80px_rgba(27,58,84,.18)]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-[#bce3fb]">
            <MonitorSmartphone size={20} />
          </span>
          <div>
            <strong className="block text-sm">Operasional Puskesmas</strong>
            <span className="text-xs text-[#a9bdcc]">Monitoring perangkat</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#214c63] px-3 py-1.5 text-[10px] font-black tracking-[0.08em] text-[#bfe8d7]">
          <span className="h-2 w-2 rounded-full bg-[#6fd5a8]" /> ONLINE
        </span>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-[#a9bdcc]">
              StuntSpecula Station 01
            </span>
            <Wifi size={18} className="text-[#78d6b0]" />
          </div>
          <strong className="mt-4 block text-xl font-black">Siap digunakan</strong>
          <p className="mt-2 text-xs leading-5 text-[#b9cbd7]">
            Heartbeat terakhir diterima beberapa detik lalu.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-[#a9bdcc]">
              Pemeriksaan hari ini
            </span>
            <BarChart3 size={18} className="text-[#f6b2ca]" />
          </div>
          <strong className="mt-4 block text-3xl font-black">24</strong>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[72%] rounded-full bg-[#79bde6]" />
          </div>
          <p className="mt-2 text-xs text-[#b9cbd7]">18 sudah selesai</p>
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
          <span className="text-[10px] font-black tracking-[0.08em] text-[#a9bdcc]">
            INSIGHT 30 HARI
          </span>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ["52", "Pemeriksaan"],
              ["9", "Perlu dipantau"],
              ["3", "Tindak lanjut"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-xl bg-white/[0.07] p-3">
                <strong className="block text-lg font-black">{value}</strong>
                <span className="mt-1 block text-[10px] leading-4 text-[#adc0cd]">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroDevice() {
  return (
    <div className="relative mx-auto min-h-[610px] w-full max-w-[620px]">
      <div className="absolute left-[8%] right-[5%] top-12 h-[520px] rounded-[3.5rem] bg-[linear-gradient(145deg,#cdeaff_0%,#eaf7ff_52%,#ffe8f1_100%)] shadow-[0_40px_100px_rgba(55,116,164,.18)]" />
      <div className="absolute left-1/2 top-7 z-10 w-[74%] -translate-x-1/2 overflow-hidden rounded-[2.7rem] border-[7px] border-white bg-white shadow-[0_28px_85px_rgba(44,96,137,.2)]">
        <div className="flex items-center justify-between border-b border-[#dfebf3] px-5 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/images/stuntspecula-logo.jpeg"
              alt="StuntSpecula"
              width={1536}
              height={1024}
              className="h-9 w-24 object-contain"
            />
            <span className="hidden text-xs font-bold text-[#718391] sm:block">
              Station 01
            </span>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#eef8f2] px-3 py-1.5 text-[10px] font-black text-[#39765f]">
            <span className="h-2 w-2 rounded-full bg-[#4aa77f]" /> ALAT SIAP
          </span>
        </div>

        <div className="relative min-h-[455px] overflow-hidden bg-[linear-gradient(180deg,#eef8ff_0%,#ffffff_62%,#fff0f5_100%)] px-6 pt-7 text-center">
          <span className="inline-flex rounded-full bg-[#e4f2fc] px-4 py-2 text-[10px] font-black tracking-[0.12em] text-[#2f6f9f]">
            HALO, AKU MIMO!
          </span>
          <h2 className="mx-auto mt-3 max-w-xs text-3xl font-black leading-[1] tracking-[-0.04em] text-[#17324d]">
            Yuk, cek <span className="text-[#b43e70]">tumbuh kembangmu</span>
          </h2>
          <Image
            src="/images/mimo-stand.png"
            alt="Mimo berdiri di layar pemeriksaan"
            width={800}
            height={800}
            className="mx-auto mt-1 h-52 w-52 object-contain"
            priority
          />
          <div className="-mt-1 grid grid-cols-3 gap-2 pb-6">
            {CHECKS.map((item, index) => (
              <div
                key={item.title}
                className="rounded-2xl border border-[#dfebf3] bg-white p-3 shadow-sm"
              >
                <span
                  className={`mx-auto grid h-9 w-9 place-items-center rounded-xl ${item.accent}`}
                >
                  <item.icon size={18} />
                </span>
                <strong className="mt-2 block text-[11px] text-[#17324d]">
                  {index + 1}. {item.title.split(" ")[0]}
                </strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute left-0 top-36 z-20 hidden rotate-[-4deg] rounded-2xl border border-[#d8e7f1] bg-white p-4 shadow-xl md:block">
        <Ruler className="text-[#2f6f9f]" size={21} />
        <strong className="mt-2 block text-sm text-[#17324d]">Tinggi tersimpan</strong>
        <span className="mt-1 block text-xs text-[#718391]">Riwayat terhubung</span>
      </div>

      <div className="absolute right-0 top-24 z-20 hidden rotate-[3deg] rounded-2xl border border-[#ead9e1] bg-white p-4 shadow-xl md:block">
        <LineChart className="text-[#b43e70]" size={21} />
        <strong className="mt-2 block text-sm text-[#17324d]">Grafik perkembangan</strong>
        <span className="mt-1 block text-xs text-[#718391]">Untuk orang tua</span>
      </div>

      <div className="absolute bottom-3 right-[4%] z-20 hidden rounded-2xl border border-[#d9e8e1] bg-white p-4 shadow-xl md:block">
        <Wifi className="text-[#39765f]" size={21} />
        <strong className="mt-2 block text-sm text-[#17324d]">Status alat online</strong>
        <span className="mt-1 block text-xs text-[#718391]">Dipantau petugas</span>
      </div>
    </div>
  );
}

export function PublicLanding() {
  return (
    <main className="min-h-svh bg-[#f7fbff] text-[#17324d]">
      <header className="sticky top-0 z-40 border-b border-[#dce8f1] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-3 md:px-8">
          <Link href="/" aria-label="StuntSpecula" className="shrink-0">
            <Image
              src="/images/stuntspecula-logo.jpeg"
              alt="StuntSpecula"
              width={1536}
              height={1024}
              className="h-12 w-36 object-contain md:h-14 md:w-40"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-bold text-[#5b7082] lg:flex">
            <a href="#ekosistem" className="transition hover:text-[#2f6f9f]">
              Ekosistem
            </a>
            <a href="#perkembangan" className="transition hover:text-[#2f6f9f]">
              Monitoring
            </a>
            <a href="#cara-kerja" className="transition hover:text-[#2f6f9f]">
              Cara kerja
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/petugas"
              className="hidden rounded-xl px-4 py-3 text-sm font-extrabold text-[#315c82] transition hover:bg-[#edf5fb] sm:inline-flex"
            >
              Petugas
            </Link>
            <Link
              href="/ortu"
              className="inline-flex items-center gap-2 rounded-xl bg-[#2f6f9f] px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#285f88]"
            >
              Portal orang tua <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[#dce8f1]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_15%,rgba(112,190,237,.22),transparent_30%),radial-gradient(circle_at_92%_20%,rgba(235,150,183,.18),transparent_26%),linear-gradient(180deg,#fbfdff_0%,#f2f9fe_100%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(#9dc6e0_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-14 md:px-8 md:py-20 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:py-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#cee2f1] bg-white/85 px-4 py-2 text-[11px] font-black tracking-[0.1em] text-[#2f6f9f] shadow-sm">
              <HeartPulse size={15} /> PEMANTAUAN PERTUMBUHAN ANAK
            </div>

            <h1 className="max-w-3xl text-4xl font-black leading-[1.01] tracking-[-0.05em] md:text-6xl lg:text-[4.5rem]">
              Pemeriksaan anak yang tidak berhenti di{" "}
              <span className="text-[#b43e70]">layar alat.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[#5c7182] md:text-lg">
              StuntSpecula menghubungkan pemeriksaan di fasilitas kesehatan,
              monitoring petugas, dan riwayat perkembangan yang dapat dipahami
              orang tua dari satu alur yang sama.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/ortu"
                className="inline-flex items-center gap-2 rounded-xl bg-[#2f6f9f] px-6 py-3.5 font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#285f88]"
              >
                Lihat portal orang tua <ArrowRight size={18} />
              </Link>
              <Link
                href="/petugas"
                className="inline-flex items-center gap-2 rounded-xl border border-[#bed5e6] bg-white px-6 py-3.5 font-extrabold text-[#284e70] transition hover:bg-[#eff6fb]"
              >
                <Building2 size={18} /> Dashboard Puskesmas
              </Link>
            </div>

            <div className="mt-9 grid max-w-2xl gap-3 sm:grid-cols-3">
              {[
                ["24–59", "bulan target pemeriksaan"],
                ["TB/U", "screening pertumbuhan"],
                ["Riwayat", "tersimpan & dapat dipantau"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[#d8e7f1] bg-white/85 px-4 py-4 shadow-[0_10px_35px_rgba(50,103,143,.07)]"
                >
                  <strong className="block text-xl font-black">{value}</strong>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-[#6d8090]">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <HeroDevice />
        </div>
      </section>

      <section id="ekosistem" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
          <div className="grid gap-8 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
            <div>
              <p className="text-xs font-black tracking-[0.12em] text-[#2f6f9f]">
                SATU EKOSISTEM
              </p>
              <h2 className="mt-3 max-w-xl text-3xl font-black tracking-[-0.04em] md:text-5xl">
                Satu pemeriksaan, tiga pengalaman yang berbeda.
              </h2>
            </div>
            <p className="max-w-2xl leading-8 text-[#617585] lg:justify-self-end">
              Setiap pengguna hanya melihat hal yang memang dibutuhkan. Petugas
              mengontrol operasional, alat memandu anak, dan orang tua fokus pada
              monitoring perkembangan.
            </p>
          </div>

          <div className="relative mt-12 grid gap-4 lg:grid-cols-3">
            <div className="pointer-events-none absolute left-[16%] right-[16%] top-12 hidden h-px bg-[linear-gradient(90deg,transparent,#bfd7e8,#bfd7e8,transparent)] lg:block" />
            {ROLES.map((role, index) => (
              <article
                key={role.title}
                className="relative rounded-[2rem] border border-[#dbe8f1] bg-[#fbfdff] p-6 shadow-[0_14px_45px_rgba(46,94,132,.06)]"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="relative z-10 grid h-14 w-14 place-items-center rounded-2xl border border-[#d8e8f3] bg-white text-[#2f6f9f] shadow-sm">
                    <role.icon size={25} />
                  </span>
                  <span className="text-2xl font-black text-[#d1dee7]">
                    0{index + 1}
                  </span>
                </div>
                <p className="mt-8 text-[11px] font-black tracking-[0.12em] text-[#728797]">
                  {role.eyebrow}
                </p>
                <h3 className="mt-2 text-xl font-black">{role.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#647887]">
                  {role.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="perkembangan"
        className="border-y border-[#dce8f1] bg-[#eff7fc]"
      >
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-black tracking-[0.12em] text-[#2f6f9f]">
              DATA YANG BENAR-BENAR DIPAKAI
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] md:text-5xl">
              Setelah pemeriksaan selesai, datanya masih berguna.
            </h2>
            <p className="mt-5 leading-8 text-[#617585]">
              Orang tua melihat perkembangan anak, sementara petugas melihat
              operasional perangkat dan gambaran hasil pemeriksaan fasilitas.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#dceffc] text-[#2f6f9f]">
                  <Smartphone size={21} />
                </span>
                <div>
                  <span className="text-[10px] font-black tracking-[0.12em] text-[#718695]">
                    ORANG TUA
                  </span>
                  <h3 className="text-xl font-black">Melihat arah perkembangan</h3>
                </div>
              </div>
              <ParentPreview />
            </div>

            <div>
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#17324d] text-white">
                  <Building2 size={21} />
                </span>
                <div>
                  <span className="text-[10px] font-black tracking-[0.12em] text-[#718695]">
                    PETUGAS / ADMIN
                  </span>
                  <h3 className="text-xl font-black">Melihat kondisi operasional</h3>
                </div>
              </div>
              <StaffPreview />
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[.92fr_1.08fr] lg:items-center">
          <div className="relative min-h-[520px]">
            <div className="absolute inset-6 rounded-[3rem] bg-[linear-gradient(145deg,#dff2ff,#f5fbff_58%,#ffeaf2)]" />
            <div className="absolute left-1/2 top-1/2 w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-[2.5rem] border border-white bg-white/85 p-7 shadow-[0_24px_70px_rgba(43,91,126,.12)] backdrop-blur">
              <div className="grid gap-6 sm:grid-cols-[.78fr_1.22fr] sm:items-center">
                <Image
                  src="/images/mimo-cheer.png"
                  alt="Mimo membantu anak mengikuti pemeriksaan"
                  width={800}
                  height={800}
                  className="mx-auto h-56 w-56 object-contain"
                />
                <div>
                  <span className="text-xs font-black tracking-[0.12em] text-[#b43e70]">
                    RAMAH UNTUK ANAK
                  </span>
                  <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">
                    Instruksi dibuat sesederhana mungkin.
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-[#637788]">
                    Anak tidak perlu memahami istilah medis. Layar hanya memberi
                    arahan singkat untuk berdiri, diam sebentar, dan melihat ke
                    kamera.
                  </p>
                </div>
              </div>
            </div>
            <span className="absolute left-2 top-16 rotate-[-7deg] rounded-full bg-[#fff0f6] px-4 py-2 text-xs font-black text-[#a43f6a] shadow-sm">
              gampang kok!
            </span>
            <span className="absolute bottom-12 right-2 rotate-[5deg] rounded-full bg-[#e9f6ef] px-4 py-2 text-xs font-black text-[#39765f] shadow-sm">
              pelan-pelan aja
            </span>
          </div>

          <div>
            <p className="text-xs font-black tracking-[0.12em] text-[#2f6f9f]">
              APA YANG DIPERIKSA
            </p>
            <h2 className="mt-3 max-w-xl text-3xl font-black tracking-[-0.04em] md:text-5xl">
              Tiga tahap utama, tanpa membuat anak kebanyakan klik.
            </h2>
            <p className="mt-5 max-w-xl leading-8 text-[#617585]">
              Perangkat menjalankan alur pemeriksaan yang ringkas. Fokusnya
              adalah pengukuran dan panduan visual, sementara keputusan screening
              pertumbuhan tetap berasal dari data tubuh dan standar yang dipakai
              sistem.
            </p>

            <div className="mt-8 grid gap-3">
              {CHECKS.map((item, index) => (
                <article
                  key={item.title}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-[#dce8f1] bg-[#fbfdff] p-4"
                >
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-2xl ${item.accent}`}
                  >
                    <item.icon size={22} />
                  </span>
                  <div>
                    <h3 className="font-black">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#647887]">
                      {item.text}
                    </p>
                  </div>
                  <span className="text-sm font-black text-[#c7d5df]">
                    0{index + 1}
                  </span>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="cara-kerja" className="border-y border-[#dce8f1] bg-[#f5f9fc]">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
          <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-xs font-black tracking-[0.12em] text-[#2f6f9f]">
                CARA KERJA
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] md:text-5xl">
                Dari dashboard petugas sampai grafik orang tua.
              </h2>
              <div className="mt-6 rounded-2xl border border-[#dce8f1] bg-white p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    className="mt-0.5 shrink-0 text-[#39765f]"
                    size={21}
                  />
                  <p className="text-sm leading-6 text-[#607585]">
                    Hasil StuntSpecula merupakan screening pertumbuhan, bukan
                    pengganti diagnosis tenaga kesehatan.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {FLOW.map((step, index) => (
                <article
                  key={step.number}
                  className="group grid gap-4 rounded-[1.6rem] border border-[#dce8f1] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[0_16px_45px_rgba(48,94,130,.08)] sm:grid-cols-[74px_1fr_auto] sm:items-center"
                >
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#edf6fc] text-lg font-black text-[#2f6f9f]">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-lg font-black">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#647887]">
                      {step.text}
                    </p>
                  </div>
                  {index < FLOW.length - 1 ? (
                    <ChevronRight
                      className="hidden text-[#a4bccd] sm:block"
                      size={22}
                    />
                  ) : (
                    <Check
                      className="hidden text-[#4a9c78] sm:block"
                      size={22}
                    />
                  )}
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[1fr_.9fr] lg:items-center">
          <div>
            <p className="text-xs font-black tracking-[0.12em] text-[#2f6f9f]">
              KENAPA TERHUBUNG ITU PENTING
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-[-0.04em] md:text-5xl">
              Sistem bukan cuma tempat menyimpan hasil pemeriksaan.
            </h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {BENEFITS.map((benefit) => (
                <div
                  key={benefit}
                  className="flex items-start gap-3 rounded-2xl border border-[#dce8f1] bg-[#fbfdff] p-4"
                >
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#e9f6ef] text-[#39765f]">
                    <Check size={15} strokeWidth={3} />
                  </span>
                  <p className="text-sm font-semibold leading-6 text-[#526b7d]">
                    {benefit}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2.5rem] bg-[#17324d] p-7 text-white shadow-[0_30px_85px_rgba(27,58,84,.2)] md:p-9">
            <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-[#2f6f9f]/45 blur-2xl" />
            <div className="absolute -bottom-20 -left-12 h-52 w-52 rounded-full bg-[#b43e70]/25 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-[#bde0f5]">
                  <Activity size={23} />
                </span>
                <div>
                  <span className="text-[10px] font-black tracking-[0.12em] text-[#a9bfce]">
                    STUNTSPECULA
                  </span>
                  <h3 className="text-xl font-black">Satu alur yang tersambung</h3>
                </div>
              </div>

              <div className="mt-8 grid gap-3">
                {[
                  [ClipboardCheck, "Pemeriksaan dijalankan petugas"],
                  [Wifi, "Perangkat memberi heartbeat"],
                  [UserRoundCheck, "Hasil terhubung ke profil anak"],
                  [LineChart, "Riwayat berkembang menjadi grafik"],
                ].map(([Icon, label]) => {
                  const ItemIcon = Icon as typeof ClipboardCheck;
                  return (
                    <div
                      key={label as string}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3"
                    >
                      <ItemIcon size={18} className="text-[#9fd2ef]" />
                      <span className="text-sm font-bold text-[#d9e5ec]">
                        {label as string}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#17324d] text-white">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(#8fb9d4_1px,transparent_1px)] [background-size:30px_30px]" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-5 py-14 md:px-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-center gap-5">
            <div className="hidden h-28 w-28 shrink-0 overflow-hidden rounded-3xl bg-white/10 sm:block">
              <Image
                src="/images/mimo-cheer.png"
                alt="Mimo"
                width={500}
                height={500}
                className="h-full w-full object-contain p-2"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[#b7d9ed]">
                <Stethoscope size={19} />
                <span className="text-sm font-bold">StuntSpecula</span>
              </div>
              <h2 className="mt-2 max-w-2xl text-3xl font-black tracking-[-0.04em]">
                Sudah punya akun? Pantau hasil anak dari sini.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#c5d5df]">
                Orang tua tidak perlu mengoperasikan alat. Hasil pemeriksaan
                akan masuk ke akun yang terhubung setelah proses selesai.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/ortu"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-extrabold text-[#17324d]"
            >
              <Baby size={18} /> Portal orang tua
            </Link>
            <Link
              href="/petugas"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-6 py-3.5 font-extrabold text-white transition hover:bg-white/10"
            >
              <Building2 size={18} /> Akses petugas
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
