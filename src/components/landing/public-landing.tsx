import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Camera,
  ChartNoAxesCombined,
  HeartPulse,
  Ruler,
  Scale,
  ShieldCheck,
} from "lucide-react";

const FEATURES = [
  {
    icon: Ruler,
    title: "Tinggi badan",
    text: "Membantu mencatat tinggi badan anak secara terstruktur.",
  },
  {
    icon: Scale,
    title: "Berat badan",
    text: "Data pengukuran tersimpan bersama riwayat pemeriksaan anak.",
  },
  {
    icon: Camera,
    title: "Indikator visual",
    text: "Kamera digunakan untuk analisis visual pendukung, bukan mengenali identitas anak.",
  },
] as const;

const STEPS = [
  "Petugas memilih profil anak yang akan diperiksa.",
  "Anak mengikuti panduan pemeriksaan pada alat StuntSpecula.",
  "Hasil pertumbuhan dihitung dan tersimpan secara otomatis.",
  "Orang tua dapat memantau hasil, riwayat, dan penjelasan tindak lanjut.",
] as const;

export function PublicLanding() {
  return (
    <main className="min-h-svh bg-[#f7fbff] text-[#17324d]">
      <header className="border-b border-[#dce9f4] bg-white/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-5 py-4 md:px-8">
          <Image
            src="/images/stuntspecula-logo.jpeg"
            alt="StuntSpecula"
            width={1536}
            height={1024}
            className="h-14 w-40 object-contain"
            priority
          />
          <nav className="flex items-center gap-2">
            <Link
              href="/petugas"
              className="hidden rounded-xl px-4 py-3 text-sm font-bold text-[#315c82] hover:bg-[#eef6fc] sm:inline-flex"
            >
              Akses petugas
            </Link>
            <Link
              href="/ortu"
              className="inline-flex items-center gap-2 rounded-xl bg-[#3475aa] px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-[#2b6594]"
            >
              Masuk orang tua <ArrowRight size={17} />
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.08fr_.92fr] md:px-8 md:py-20">
        <div className="flex flex-col justify-center">
          <span className="mb-5 w-fit rounded-full border border-[#cfe4f4] bg-white px-4 py-2 text-xs font-extrabold tracking-[0.08em] text-[#3475aa]">
            PEMANTAUAN PERTUMBUHAN ANAK
          </span>
          <h1 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-[-0.04em] md:text-6xl">
            Pantau tumbuh kembang anak dengan lebih mudah.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#5d7184] md:text-lg">
            StuntSpecula membantu fasilitas kesehatan melakukan pemeriksaan
            pertumbuhan anak, menyimpan riwayat hasil, dan memberikan informasi
            yang lebih mudah dipahami oleh orang tua.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/ortu"
              className="inline-flex items-center gap-2 rounded-xl bg-[#3475aa] px-6 py-3.5 font-extrabold text-white shadow-sm hover:bg-[#2b6594]"
            >
              Masuk sebagai orang tua <ArrowRight size={18} />
            </Link>
            <Link
              href="/petugas"
              className="inline-flex items-center gap-2 rounded-xl border border-[#bdd6e8] bg-white px-6 py-3.5 font-extrabold text-[#284e70] hover:bg-[#f1f7fb]"
            >
              <Building2 size={18} /> Dashboard Puskesmas
            </Link>
          </div>
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-[#dce9f4] bg-white p-4 text-sm leading-6 text-[#5d7184]">
            <ShieldCheck className="mt-0.5 shrink-0 text-[#39765f]" size={21} />
            <p>
              Hasil StuntSpecula merupakan hasil skrining pertumbuhan dan bukan
              pengganti diagnosis tenaga kesehatan.
            </p>
          </div>
        </div>

        <div className="relative flex min-h-[440px] items-center justify-center overflow-hidden rounded-[2.25rem] border border-[#d8e8f4] bg-[linear-gradient(180deg,#dff2ff_0%,#eef8ff_55%,#ffeaf2_100%)] p-7 shadow-[0_24px_70px_rgba(45,104,151,.12)]">
          <div className="absolute left-7 top-7 rounded-2xl bg-white/90 px-4 py-3 shadow-sm">
            <HeartPulse className="text-[#3475aa]" size={28} />
          </div>
          <div className="w-full max-w-[300px] text-center">
            <Image
              src="/images/mimo-cheer.png"
              alt="Mimo, teman pemeriksaan StuntSpecula"
              width={800}
              height={800}
              className="mx-auto h-64 w-64 object-contain"
            />
            <div className="rounded-2xl bg-white/90 px-5 py-4 shadow-sm backdrop-blur">
              <strong className="block text-lg">Pemeriksaan yang ramah anak</strong>
              <p className="mt-1 text-sm leading-6 text-[#64788a]">
                Panduan pada layar membantu anak mengikuti setiap tahap dengan
                sederhana.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#dce9f4] bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14 md:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold tracking-[0.12em] text-[#3475aa]">
              APA YANG DIPERIKSA
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.03em]">
              Data utama untuk memantau pertumbuhan.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-[#dce9f4] bg-[#fbfdff] p-6"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#e7f3fc] text-[#3475aa]">
                  <feature.icon size={23} />
                </span>
                <h3 className="mt-5 text-lg font-extrabold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#64788a]">
                  {feature.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20">
        <div className="grid gap-10 md:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="text-xs font-extrabold tracking-[0.12em] text-[#3475aa]">
              CARA KERJA
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.03em]">
              Dari pemeriksaan sampai hasil orang tua.
            </h2>
            <p className="mt-4 leading-7 text-[#64788a]">
              Petugas mengoperasikan proses pemeriksaan, sedangkan orang tua
              dapat fokus memantau hasil dan riwayat anak dari akun masing-masing.
            </p>
          </div>
          <ol className="grid gap-3">
            {STEPS.map((step, index) => (
              <li
                key={step}
                className="flex items-start gap-4 rounded-2xl border border-[#dce9f4] bg-white p-5"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#17324d] text-sm font-black text-white">
                  {index + 1}
                </span>
                <p className="pt-1 leading-7 text-[#4f6679]">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-[#17324d] text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-12 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <div className="flex items-center gap-2 text-[#b9d9ef]">
              <ChartNoAxesCombined size={20} />
              <span className="text-sm font-bold">StuntSpecula</span>
            </div>
            <h2 className="mt-2 text-2xl font-black">
              Sudah memiliki akun orang tua?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#c7d6e2]">
              Masuk untuk melihat hasil pemeriksaan dan riwayat pertumbuhan anak.
            </p>
          </div>
          <Link
            href="/ortu"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-extrabold text-[#17324d]"
          >
            Buka portal orang tua <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
