import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Baby,
  BarChart3,
  Building2,
  Camera,
  ChevronRight,
  ClipboardCheck,
  HeartPulse,
  LineChart,
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
    text: "Pengukuran tinggi menjadi dasar pemantauan TB/U pada anak usia 24–59 bulan.",
  },
  {
    icon: Scale,
    title: "Berat badan",
    text: "Berat badan tersimpan bersama pemeriksaan untuk membantu melihat perkembangan anak dari waktu ke waktu.",
  },
  {
    icon: Camera,
    title: "Indikator visual",
    text: "Kamera digunakan untuk pemeriksaan visual pendukung pada area wajah, bukan untuk mengenali identitas anak.",
  },
] as const;

const FLOW = [
  {
    number: "01",
    title: "Petugas memilih anak",
    text: "Profil anak dipilih dari dashboard Puskesmas sebelum pemeriksaan dimulai.",
  },
  {
    number: "02",
    title: "Anak mengikuti panduan alat",
    text: "Layar vertikal memberikan instruksi sederhana untuk tinggi, berat, dan kamera.",
  },
  {
    number: "03",
    title: "Sistem mengolah hasil",
    text: "Data pertumbuhan diproses dan hasil skrining TB/U disiapkan secara otomatis.",
  },
  {
    number: "04",
    title: "Orang tua memantau",
    text: "Hasil, riwayat, dan tindak lanjut dapat dibaca kembali melalui akun orang tua.",
  },
] as const;

const ROLES = [
  {
    icon: Building2,
    eyebrow: "PUSKESMAS",
    title: "Mengelola pemeriksaan",
    text: "Petugas memilih anak, memantau proses, melihat riwayat, kondisi alat, dan insight fasilitas.",
  },
  {
    icon: Smartphone,
    eyebrow: "ORANG TUA",
    title: "Memantau pertumbuhan",
    text: "Orang tua melihat hasil pemeriksaan, riwayat pertumbuhan, tindak lanjut, dan penjelasan hasil.",
  },
  {
    icon: HeartPulse,
    eyebrow: "ALAT STUNTSPECULA",
    title: "Memandu pemeriksaan",
    text: "Layar alat fokus pada pengalaman anak dan menjadi penghubung antara pemeriksaan fisik dengan sistem.",
  },
] as const;

const PRODUCT_POINTS = [
  [
    UserRoundCheck,
    "Data anak terhubung",
    "Riwayat tersimpan pada profil yang sama.",
  ],
  [
    Wifi,
    "Status alat terlihat",
    "Petugas dapat melihat apakah layar alat masih terhubung.",
  ],
  [
    BarChart3,
    "Insight fasilitas",
    "Admin melihat pola hasil pemeriksaan tanpa rekap manual.",
  ],
] as const;

export function PublicLanding() {
  return (
    <main className="min-h-svh bg-[#f6faff] text-[#17324d]">
      <header className="sticky top-0 z-30 border-b border-[#dbe8f2] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-3.5 md:px-8">
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
          <nav className="flex items-center gap-2">
            <Link
              href="/petugas"
              className="hidden rounded-xl px-4 py-3 text-sm font-bold text-[#315c82] transition hover:bg-[#edf5fb] sm:inline-flex"
            >
              Dashboard Puskesmas
            </Link>
            <Link
              href="/ortu"
              className="inline-flex items-center gap-2 rounded-xl bg-[#2f6f9f] px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#285f88]"
            >
              Masuk orang tua <ArrowRight size={17} />
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[#dbe8f2]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(117,194,238,.22),transparent_28%),radial-gradient(circle_at_88%_22%,rgba(239,161,190,.17),transparent_26%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-14 md:grid-cols-[1.05fr_.95fr] md:px-8 md:py-20 lg:py-24">
          <div className="flex flex-col justify-center">
            <div className="mb-6 flex w-fit items-center gap-2 rounded-full border border-[#cfe2f1] bg-white/85 px-4 py-2 text-xs font-extrabold tracking-[0.08em] text-[#2f6f9f] shadow-sm">
              <HeartPulse size={15} /> PEMANTAUAN PERTUMBUHAN ANAK
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.03] tracking-[-0.045em] md:text-6xl lg:text-[4.4rem]">
              Pemeriksaan anak yang terhubung dari alat sampai orang tua.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#5b7082] md:text-lg">
              StuntSpecula membantu Puskesmas menjalankan pemeriksaan
              pertumbuhan, menyimpan riwayat anak, dan menyampaikan hasil
              skrining dengan bahasa yang lebih mudah dipahami keluarga.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/ortu"
                className="inline-flex items-center gap-2 rounded-xl bg-[#2f6f9f] px-6 py-3.5 font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#285f88]"
              >
                Buka portal orang tua <ArrowRight size={18} />
              </Link>
              <Link
                href="/petugas"
                className="inline-flex items-center gap-2 rounded-xl border border-[#bdd4e5] bg-white px-6 py-3.5 font-extrabold text-[#284e70] transition hover:bg-[#edf5fb]"
              >
                <Building2 size={18} /> Akses Puskesmas
              </Link>
            </div>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {[
                ["24–59", "bulan target pemeriksaan"],
                ["TB/U", "skrining pertumbuhan"],
                ["1 akun", "riwayat anak terhubung"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[#d7e6f1] bg-white/80 px-4 py-4 shadow-sm"
                >
                  <strong className="block text-xl font-black text-[#17324d]">
                    {value}
                  </strong>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-[#6a7d8d]">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex min-h-[540px] items-center justify-center">
            <div className="absolute inset-x-6 bottom-2 top-8 rounded-[2.75rem] bg-[#d9effd]" />
            <div className="relative z-10 w-full max-w-[480px] overflow-hidden rounded-[2.5rem] border border-white/80 bg-white shadow-[0_30px_90px_rgba(48,102,145,.18)]">
              <div className="flex items-center justify-between border-b border-[#e1ebf2] px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e4f2fc] text-[#2f6f9f]">
                    <Activity size={20} />
                  </span>
                  <div>
                    <strong className="block text-sm">
                      Pemeriksaan StuntSpecula
                    </strong>
                    <span className="text-xs text-[#6d7f8d]">
                      Panduan ramah anak
                    </span>
                  </div>
                </div>
                <span className="rounded-full bg-[#edf8f1] px-3 py-1.5 text-[11px] font-extrabold text-[#39755a]">
                  ALAT SIAP
                </span>
              </div>

              <div className="relative bg-[linear-gradient(180deg,#edf8ff_0%,#ffffff_58%,#fff0f5_100%)] px-7 pt-8 text-center">
                <p className="text-xs font-extrabold tracking-[0.12em] text-[#2f6f9f]">
                  BARENG MIMO
                </p>
                <h2 className="mx-auto mt-2 max-w-sm text-3xl font-black tracking-[-0.035em]">
                  Tiga langkah sederhana untuk cek pertumbuhan
                </h2>
                <Image
                  src="/images/mimo-cheer.png"
                  alt="Mimo, teman pemeriksaan StuntSpecula"
                  width={800}
                  height={800}
                  className="mx-auto mt-3 h-56 w-56 object-contain"
                />
                <div className="-mt-4 grid grid-cols-3 gap-2 pb-7">
                  {[
                    [Ruler, "Tinggi"],
                    [Scale, "Berat"],
                    [Camera, "Wajah"],
                  ].map(([Icon, label]) => {
                    const StepIcon = Icon as typeof Ruler;
                    return (
                      <div
                        key={label as string}
                        className="rounded-2xl border border-[#dbe8f2] bg-white px-3 py-4 shadow-sm"
                      >
                        <StepIcon
                          className="mx-auto text-[#2f6f9f]"
                          size={19}
                        />
                        <span className="mt-2 block text-xs font-extrabold">
                          {label as string}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="absolute right-0 top-4 z-20 hidden rounded-2xl border border-[#dce8f0] bg-white p-4 shadow-lg lg:block">
              <LineChart className="text-[#c54f80]" size={20} />
              <strong className="mt-3 block text-sm">Riwayat tersimpan</strong>
              <span className="mt-1 block text-xs text-[#70818f]">
                Bisa dipantau kembali
              </span>
            </div>
            <div className="absolute bottom-0 left-0 z-20 hidden rounded-2xl border border-[#dce8f0] bg-white p-4 shadow-lg lg:block">
              <Wifi className="text-[#39755a]" size={20} />
              <strong className="mt-3 block text-sm">Alat terhubung</strong>
              <span className="mt-1 block text-xs text-[#70818f]">
                Status terlihat petugas
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
          <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-xs font-extrabold tracking-[0.12em] text-[#2f6f9f]">
                SATU EKOSISTEM
              </p>
              <h2 className="mt-3 max-w-xl text-3xl font-black tracking-[-0.035em] md:text-4xl">
                Setiap pengguna punya peran yang jelas.
              </h2>
            </div>
            <p className="max-w-2xl leading-7 text-[#617585] lg:justify-self-end">
              Pemeriksaan tetap berpusat pada alat dan petugas, sementara orang
              tua memperoleh akses monitoring tanpa perlu mengoperasikan proses
              klinis.
            </p>
          </div>

          <div className="mt-9 grid gap-4 lg:grid-cols-3">
            {ROLES.map((role, index) => (
              <article
                key={role.title}
                className="group rounded-[1.75rem] border border-[#dbe7f0] bg-[#fbfdff] p-6 transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(46,94,132,.10)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e7f3fb] text-[#2f6f9f]">
                    <role.icon size={23} />
                  </span>
                  <span className="text-sm font-black text-[#c7d5df]">
                    0{index + 1}
                  </span>
                </div>
                <p className="mt-8 text-[11px] font-extrabold tracking-[0.12em] text-[#6f8799]">
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

      <section className="border-y border-[#dbe7f0] bg-[#eef6fb]">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-extrabold tracking-[0.12em] text-[#2f6f9f]">
                BUKAN SEKADAR HASIL SEKALI LIHAT
              </p>
              <h2 className="mt-3 max-w-xl text-3xl font-black tracking-[-0.035em] md:text-4xl">
                Data pemeriksaan ikut hidup di dalam sistem.
              </h2>
              <p className="mt-5 max-w-xl leading-7 text-[#617585]">
                Setelah pemeriksaan selesai, hasil tidak berhenti di alat. Data
                masuk ke riwayat anak, bisa dipantau orang tua, dan menjadi
                insight operasional untuk Puskesmas.
              </p>
              <div className="mt-7 grid gap-3">
                {PRODUCT_POINTS.map(([Icon, title, text]) => (
                  <div
                    key={title}
                    className="flex gap-4 rounded-2xl border border-[#d9e6ef] bg-white p-4"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e7f3fb] text-[#2f6f9f]">
                      <Icon size={19} />
                    </span>
                    <div>
                      <strong className="block text-sm">{title}</strong>
                      <p className="mt-1 text-sm leading-6 text-[#6a7d8c]">
                        {text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <article className="overflow-hidden rounded-[2rem] border border-[#d9e6ef] bg-white shadow-[0_18px_55px_rgba(47,98,137,.10)]">
                <div className="border-b border-[#e2ebf2] px-5 py-4">
                  <span className="text-[11px] font-extrabold tracking-[0.12em] text-[#6d8799]">
                    PORTAL ORANG TUA
                  </span>
                  <h3 className="mt-1 text-lg font-black">Pertumbuhan anak</h3>
                </div>
                <div className="p-5">
                  <div className="rounded-2xl bg-[#f3f8fc] p-4">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold text-[#718493]">
                          TB/U terakhir
                        </span>
                        <strong className="mt-1 block text-2xl font-black">
                          -1.42 SD
                        </strong>
                      </div>
                      <span className="rounded-full bg-[#fff4dd] px-3 py-1.5 text-[11px] font-extrabold text-[#916821]">
                        Perlu dipantau
                      </span>
                    </div>
                    <div className="mt-5 flex h-24 items-end gap-2">
                      {[42, 55, 50, 68, 63, 79, 86].map((height, index) => (
                        <span
                          key={index}
                          className="flex-1 rounded-t-md bg-[#8fc3e7]"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-[#e0eaf1] p-4">
                      <span className="text-xs text-[#758694]">Tinggi</span>
                      <strong className="mt-1 block text-lg">96.8 cm</strong>
                    </div>
                    <div className="rounded-2xl border border-[#e0eaf1] p-4">
                      <span className="text-xs text-[#758694]">Berat</span>
                      <strong className="mt-1 block text-lg">14.2 kg</strong>
                    </div>
                  </div>
                </div>
              </article>

              <article className="overflow-hidden rounded-[2rem] border border-[#d9e6ef] bg-[#17324d] text-white shadow-[0_18px_55px_rgba(36,75,104,.18)]">
                <div className="border-b border-white/10 px-5 py-4">
                  <span className="text-[11px] font-extrabold tracking-[0.12em] text-[#a8c8df]">
                    DASHBOARD PUSKESMAS
                  </span>
                  <h3 className="mt-1 text-lg font-black">
                    Monitoring hari ini
                  </h3>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ["12", "Pemeriksaan"],
                      ["10", "Selesai"],
                      ["1", "Berjalan"],
                      ["1", "Perlu tindak lanjut"],
                    ].map(([value, label]) => (
                      <div key={label} className="rounded-2xl bg-white/10 p-4">
                        <strong className="block text-2xl font-black">
                          {value}
                        </strong>
                        <span className="mt-1 block text-xs leading-5 text-[#bfd1df]">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-2xl bg-white/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-sm font-bold">
                        <Wifi size={16} /> StuntSpecula Station
                      </span>
                      <span className="rounded-full bg-[#2f7657] px-2.5 py-1 text-[10px] font-extrabold">
                        ONLINE
                      </span>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-white/10">
                      <div className="h-2 w-[82%] rounded-full bg-[#8bc6ea]" />
                    </div>
                    <p className="mt-2 text-xs text-[#bcd0df]">
                      Status aplikasi alat terhubung dengan dashboard.
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
          <div className="text-center">
            <p className="text-xs font-extrabold tracking-[0.12em] text-[#2f6f9f]">
              APA YANG DIPERIKSA
            </p>
            <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-black tracking-[-0.035em] md:text-4xl">
              Fokus pada data yang dibutuhkan untuk pemantauan pertumbuhan.
            </h2>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {CHECKS.map((item) => (
              <article
                key={item.title}
                className="rounded-[1.75rem] border border-[#d8e6f0] bg-white p-7 shadow-[0_12px_35px_rgba(49,94,129,.06)]"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e8f4fc] text-[#2f6f9f]">
                  <item.icon size={23} />
                </span>
                <h3 className="mt-6 text-xl font-black">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#637786]">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#dbe7f0] bg-[#f6f9fc]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-[.75fr_1.25fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs font-extrabold tracking-[0.12em] text-[#2f6f9f]">
              ALUR PEMERIKSAAN
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] md:text-4xl">
              Dari Puskesmas sampai hasil ada di tangan orang tua.
            </h2>
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#dbe7f0] bg-white p-4 text-sm leading-6 text-[#607585]">
              <ShieldCheck
                className="mt-0.5 shrink-0 text-[#39755a]"
                size={20}
              />
              <p>
                Hasil StuntSpecula merupakan hasil skrining pertumbuhan dan
                bukan pengganti diagnosis tenaga kesehatan.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {FLOW.map((step) => (
              <article
                key={step.number}
                className="grid gap-4 rounded-[1.5rem] border border-[#dbe7f0] bg-white p-5 sm:grid-cols-[72px_1fr_auto] sm:items-center"
              >
                <span className="text-2xl font-black tracking-[-0.04em] text-[#aec7d9]">
                  {step.number}
                </span>
                <div>
                  <h3 className="text-lg font-black">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#647887]">
                    {step.text}
                  </p>
                </div>
                <ChevronRight
                  className="hidden text-[#9ab4c6] sm:block"
                  size={21}
                />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#17324d] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 md:px-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-[#b9d9ef]">
              <Stethoscope size={20} />
              <span className="text-sm font-bold">StuntSpecula</span>
            </div>
            <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-[-0.035em]">
              Hasil pemeriksaan tidak berhenti di layar alat.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#c6d5e1]">
              Riwayat pertumbuhan tersimpan dan dapat dipantau kembali oleh
              orang tua serta fasilitas kesehatan untuk membantu tindak lanjut.
            </p>
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
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-6 py-3.5 font-extrabold text-white"
            >
              <ClipboardCheck size={18} /> Dashboard petugas
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
