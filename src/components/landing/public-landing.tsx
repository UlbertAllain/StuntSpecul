import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Camera,
  Check,
  Ruler,
  Scale,
  ShieldCheck,
} from "lucide-react";

const EXAM_STEPS = [
  {
    number: "01",
    title: "Tinggi",
    caption: "Berdiri tegak",
    description:
      "Tinggi badan digunakan untuk pemantauan TB/U pada anak usia 24–59 bulan.",
    icon: Ruler,
  },
  {
    number: "02",
    title: "Berat",
    caption: "Diam sebentar",
    description:
      "Berat badan disimpan bersama pemeriksaan untuk melihat perubahan dari waktu ke waktu.",
    icon: Scale,
  },
  {
    number: "03",
    title: "Kamera",
    caption: "Lihat ke depan",
    description:
      "Tahap kamera digunakan untuk pemeriksaan visual pendukung, bukan untuk mengenali identitas anak.",
    icon: Camera,
  },
] as const;

const JOURNEY = [
  {
    number: "01",
    title: "Petugas memilih anak",
    text: "Pemeriksaan dimulai dari profil anak yang sudah terdaftar di fasilitas kesehatan.",
  },
  {
    number: "02",
    title: "Mimo memandu pemeriksaan",
    text: "Anak cukup mengikuti arahan sederhana pada layar alat.",
  },
  {
    number: "03",
    title: "Hasil tersimpan",
    text: "Data tubuh dan hasil skrining masuk ke riwayat pemeriksaan yang sama.",
  },
  {
    number: "04",
    title: "Orang tua memantau",
    text: "Perkembangan dapat dilihat kembali dari portal orang tua.",
  },
] as const;

function GrowthPreview() {
  return (
    <div className="border border-[#ccdbe7] bg-white">
      <div className="grid border-b border-[#d7e3ec] md:grid-cols-[1.25fr_.75fr]">
        <div className="p-6 md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#63798b]">
            Riwayat pertumbuhan
          </p>
          <h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-[#18334d]">
            Perkembangan Aira
          </h3>
        </div>

        <div className="border-t border-[#d7e3ec] p-6 md:border-l md:border-t-0 md:p-8">
          <span className="block text-xs font-semibold text-[#6d8190]">
            Pemeriksaan terakhir
          </span>
          <strong className="mt-1 block text-lg font-black text-[#18334d]">
            12 September 2026
          </strong>
        </div>
      </div>

      <div className="grid md:grid-cols-[.72fr_1.28fr]">
        <div className="border-b border-[#d7e3ec] md:border-b-0 md:border-r">
          {[
            ["94.2 cm", "Tinggi", "+1.8 cm dari sebelumnya"],
            ["13.8 kg", "Berat", "+0.6 kg dari sebelumnya"],
            ["-1.42 SD", "TB/U", "Perlu dipantau"],
          ].map(([value, label, note], index) => (
            <div
              key={label}
              className={
                index === 2
                  ? "p-6"
                  : "border-b border-[#d7e3ec] p-6"
              }
            >
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#6e8190]">
                {label}
              </span>
              <strong className="mt-2 block text-2xl font-black text-[#18334d]">
                {value}
              </strong>
              <span className="mt-1 block text-sm text-[#617585]">{note}</span>
            </div>
          ))}
        </div>

        <div className="p-6 md:p-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#6e8190]">
                Tren TB/U
              </span>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[#617585]">
                Nilai dilihat dari beberapa pemeriksaan, bukan dari satu angka
                saja.
              </p>
            </div>
            <strong className="text-sm font-black text-[#2f6f9f]">6 data</strong>
          </div>

          <svg
            className="mt-8 h-56 w-full text-[#2f6f9f]"
            viewBox="0 0 520 220"
            role="img"
            aria-label="Contoh grafik perkembangan TB/U"
          >
            {[45, 95, 145].map((y) => (
              <line
                key={y}
                x1="30"
                x2="500"
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.1"
              />
            ))}

            <line
              x1="30"
              x2="500"
              y1="165"
              y2="165"
              stroke="#bb4778"
              strokeWidth="1.5"
              strokeDasharray="7 7"
              opacity="0.55"
            />

            <text
              x="498"
              y="158"
              textAnchor="end"
              fontSize="11"
              fontWeight="700"
              fill="#a53f6b"
            >
              -2 SD
            </text>

            <polyline
              points="40,150 130,138 220,124 310,108 400,92 490,82"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {[
              [40, 150],
              [130, 138],
              [220, 124],
              [310, 108],
              [400, 92],
              [490, 82],
            ].map(([x, y]) => (
              <circle
                key={`${x}-${y}`}
                cx={x}
                cy={y}
                r="5"
                fill="white"
                stroke="currentColor"
                strokeWidth="3"
              />
            ))}

            {[
              ["Apr", 40],
              ["Mei", 130],
              ["Jun", 220],
              ["Jul", 310],
              ["Agu", 400],
              ["Sep", 490],
            ].map(([label, x]) => (
              <text
                key={label}
                x={x}
                y="205"
                textAnchor="middle"
                fontSize="11"
                fill="#718493"
              >
                {label}
              </text>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

function StaffPreview() {
  return (
    <div className="border border-[#294a64] bg-[#17324d] text-white">
      <div className="grid min-h-[440px] md:grid-cols-[180px_1fr]">
        <aside className="border-b border-white/10 p-5 md:border-b-0 md:border-r">
          <strong className="block text-lg font-black">StuntSpecula</strong>
          <span className="mt-1 block text-xs text-[#9fb3c2]">
            Puskesmas Dashboard
          </span>

          <div className="mt-10 hidden space-y-5 text-sm md:block">
            <span className="block font-bold text-white">Dashboard</span>
            <span className="block text-[#9fb3c2]">Data anak</span>
            <span className="block text-[#9fb3c2]">Pemeriksaan</span>
            <span className="block text-[#9fb3c2]">Monitoring alat</span>
            <span className="block text-[#9fb3c2]">Insight</span>
          </div>
        </aside>

        <div>
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <div>
              <span className="block text-xs uppercase tracking-[0.13em] text-[#9fb3c2]">
                Monitoring alat
              </span>
              <strong className="mt-1 block text-xl font-black">
                Station 01
              </strong>
            </div>
            <span className="flex items-center gap-2 text-sm font-bold text-[#8fe0bb]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#6dd2a4]" />
              Online
            </span>
          </div>

          <div className="grid md:grid-cols-[1.1fr_.9fr]">
            <div className="border-b border-white/10 p-6 md:border-b-0 md:border-r">
              <span className="text-xs uppercase tracking-[0.13em] text-[#9fb3c2]">
                Kondisi saat ini
              </span>

              <strong className="mt-8 block text-4xl font-black">
                Siap digunakan
              </strong>
              <p className="mt-3 max-w-sm text-sm leading-6 text-[#b9c9d4]">
                Layar alat masih mengirim heartbeat dan tidak ada pemeriksaan
                aktif.
              </p>

              <dl className="mt-10 space-y-4 text-sm">
                <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                  <dt className="text-[#9fb3c2]">Terakhir terhubung</dt>
                  <dd className="font-bold">baru saja</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                  <dt className="text-[#9fb3c2]">Sensor tinggi</dt>
                  <dd className="font-bold">Menunggu perangkat</dd>
                </div>
                <div className="flex justify-between gap-4 pb-3">
                  <dt className="text-[#9fb3c2]">Sensor berat</dt>
                  <dd className="font-bold">Menunggu perangkat</dd>
                </div>
              </dl>
            </div>

            <div className="p-6">
              <span className="text-xs uppercase tracking-[0.13em] text-[#9fb3c2]">
                30 hari terakhir
              </span>

              <div className="mt-8">
                <strong className="text-5xl font-black">52</strong>
                <span className="ml-2 text-sm text-[#aebfca]">pemeriksaan</span>
              </div>

              <div className="mt-10 space-y-5">
                {[
                  ["Selesai", "44", "84%"],
                  ["Perlu dipantau", "6", "12%"],
                  ["Tindak lanjut", "2", "4%"],
                ].map(([label, value, width]) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#b6c7d2]">{label}</span>
                      <strong>{value}</strong>
                    </div>
                    <div className="mt-2 h-1.5 bg-white/10">
                      <div
                        className="h-full bg-[#75b8df]"
                        style={{ width }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroIllustration() {
  return (
    <div className="relative mx-auto min-h-[570px] w-full max-w-[560px]">
      <div className="absolute left-1/2 top-0 h-[520px] w-[330px] -translate-x-1/2 border-x border-[#a8c8dd] bg-[#e9f5fc]" />

      <div className="absolute left-[12%] top-10 hidden h-[430px] w-px bg-[#8fb6ce] sm:block">
        {Array.from({ length: 15 }).map((_, index) => (
          <span
            key={index}
            className="absolute left-0 h-px bg-[#8fb6ce]"
            style={{
              top: `${index * 7.1}%`,
              width: index % 5 === 0 ? 26 : 13,
            }}
          />
        ))}
        <span className="absolute -left-1 top-0 -translate-x-full pr-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#56758b]">
          Tinggi
        </span>
      </div>

      <div className="absolute right-[8%] top-24 hidden text-right sm:block">
        <span className="block text-[11px] font-bold uppercase tracking-[0.13em] text-[#667f90]">
          01 / 03
        </span>
        <strong className="mt-1 block text-xl font-black">Berdiri tegak</strong>
      </div>

      <div className="absolute left-1/2 top-11 z-10 -translate-x-1/2">
        <Image
          src="/images/mimo-stand.png"
          alt="Mimo, karakter pendamping StuntSpecula"
          width={800}
          height={800}
          className="h-[400px] w-[300px] object-contain"
          priority
        />
      </div>

      <div className="absolute bottom-12 left-1/2 z-20 w-[86%] -translate-x-1/2 border-y border-[#9fbfd4] bg-[#f8fcff] py-5">
        <div className="grid grid-cols-3 divide-x divide-[#c9dce8] text-center">
          {[
            ["94.2", "cm", "Tinggi"],
            ["13.8", "kg", "Berat"],
            ["-1.42", "SD", "TB/U"],
          ].map(([value, unit, label]) => (
            <div key={label} className="px-3">
              <strong className="text-2xl font-black tracking-[-0.03em] text-[#18334d]">
                {value}
              </strong>
              <span className="ml-1 text-xs font-bold text-[#58758a]">
                {unit}
              </span>
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#708695]">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="absolute bottom-0 left-1/2 w-full -translate-x-1/2 text-center text-xs leading-5 text-[#6a8090]">
        Ilustrasi alur pemeriksaan · data contoh
      </p>
    </div>
  );
}

export function PublicLanding() {
  return (
    <main className="min-h-svh bg-[#fbfaf6] text-[#18334d]">
      <header className="border-b border-[#d9e1e5] bg-[#fbfaf6]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 md:px-8">
          <Link href="/" aria-label="StuntSpecula" className="shrink-0">
            <Image
              src="/images/stuntspecula-logo.jpeg"
              alt="StuntSpecula"
              width={1536}
              height={1024}
              className="h-11 w-32 object-contain mix-blend-multiply md:h-12 md:w-36"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#536b7d] md:flex">
            <a href="#tentang" className="hover:text-[#18334d]">
              Tentang
            </a>
            <a href="#pemeriksaan" className="hover:text-[#18334d]">
              Pemeriksaan
            </a>
            <a href="#monitoring" className="hover:text-[#18334d]">
              Monitoring
            </a>
          </nav>

          <div className="flex items-center gap-4 text-sm font-bold">
            <Link href="/petugas" className="hidden text-[#536b7d] sm:inline">
              Petugas
            </Link>
            <Link
              href="/ortu"
              className="inline-flex items-center gap-2 border-b-2 border-[#2f6f9f] pb-1 text-[#2f6f9f]"
            >
              Masuk orang tua <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-[#d9e1e5]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 pb-10 pt-14 md:px-8 md:pb-16 md:pt-20 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:pt-24">
          <div className="max-w-3xl">
            <p className="text-sm font-bold text-[#2f6f9f]">
              StuntSpecula · Pemantauan pertumbuhan anak
            </p>

            <h1 className="mt-7 text-[3.1rem] font-black leading-[0.98] tracking-[-0.055em] sm:text-[4.4rem] lg:text-[5.4rem]">
              Pantau pertumbuhan anak,
              <span className="block text-[#b43e70]">
                dari pemeriksaan hingga rumah.
              </span>
            </h1>

            <p className="mt-8 max-w-2xl text-base leading-8 text-[#5b7080] md:text-lg">
              StuntSpecula menghubungkan alat pemeriksaan, petugas fasilitas
              kesehatan, dan orang tua dalam satu riwayat pertumbuhan yang
              berkelanjutan.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
              <Link
                href="/ortu"
                className="inline-flex items-center gap-3 bg-[#2f6f9f] px-6 py-4 text-sm font-black text-white transition hover:bg-[#285f88]"
              >
                Buka portal orang tua <ArrowRight size={17} />
              </Link>
              <a
                href="#tentang"
                className="border-b border-[#18334d] pb-1 text-sm font-bold"
              >
                Kenali sistem
              </a>
            </div>
          </div>

          <HeroIllustration />
        </div>

        <div className="mx-auto grid max-w-7xl border-t border-[#d9e1e5] px-5 md:grid-cols-3 md:px-8">
          {[
            ["24–59 bulan", "Fokus usia pemeriksaan berdiri"],
            ["TB/U", "Skrining tinggi badan menurut umur"],
            ["Riwayat terhubung", "Hasil dapat dipantau kembali"],
          ].map(([value, label], index) => (
            <div
              key={value}
              className={
                index === 2
                  ? "py-5 md:px-7"
                  : "border-b border-[#d9e1e5] py-5 md:border-b-0 md:border-r md:px-7"
              }
            >
              <strong className="block text-lg font-black">{value}</strong>
              <span className="mt-1 block text-sm text-[#687d8d]">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="tentang" className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[.72fr_1.28fr]">
          <div>
            <span className="text-sm font-bold text-[#2f6f9f]">Tentang sistem</span>
          </div>

          <div>
            <h2 className="max-w-4xl text-3xl font-black leading-[1.08] tracking-[-0.045em] md:text-5xl">
              Pemeriksaan bukan titik akhir. Yang penting adalah melihat
              bagaimana anak berkembang dari waktu ke waktu.
            </h2>

            <div className="mt-10 grid gap-8 border-t border-[#d9e1e5] pt-8 md:grid-cols-2">
              <p className="leading-8 text-[#5f7484]">
                Di fasilitas kesehatan, petugas mengatur pemeriksaan dan
                memantau alat. Anak cukup mengikuti panduan Mimo pada layar.
              </p>
              <p className="leading-8 text-[#5f7484]">
                Setelah selesai, hasil masuk ke riwayat anak sehingga orang tua
                dapat melihat perkembangan tanpa mengoperasikan alat atau
                mengubah hasil.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#cadbe6] bg-[#e8f4fb]">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
          <div className="grid gap-10 md:grid-cols-4">
            {JOURNEY.map((item, index) => (
              <div
                key={item.number}
                className={index === 3 ? "" : "md:border-r md:border-[#bcd3e1] md:pr-7"}
              >
                <span className="text-sm font-black text-[#2f6f9f]">
                  {item.number}
                </span>
                <h3 className="mt-5 text-xl font-black tracking-[-0.025em]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#587082]">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pemeriksaan" className="bg-[#17324d] text-white">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div className="relative min-h-[460px]">
            <div className="absolute bottom-0 left-1/2 h-[390px] w-[300px] -translate-x-1/2 border-x border-white/15" />
            <Image
              src="/images/mimo-cheer.png"
              alt="Mimo menemani pemeriksaan anak"
              width={800}
              height={800}
              className="absolute bottom-0 left-1/2 h-[430px] w-[360px] -translate-x-1/2 object-contain"
            />
            <span className="absolute left-0 top-16 hidden max-w-[150px] text-sm leading-6 text-[#a9c0d0] md:block">
              Tidak perlu banyak klik. Anak cukup mengikuti arahan.
            </span>
          </div>

          <div>
            <span className="text-sm font-bold text-[#9fd1ee]">
              Pemeriksaan bersama Mimo
            </span>
            <h2 className="mt-4 max-w-2xl text-3xl font-black leading-[1.07] tracking-[-0.045em] md:text-5xl">
              Tiga tahap. Instruksi singkat. Tidak terasa seperti mengisi
              formulir.
            </h2>

            <div className="mt-12 border-t border-white/15">
              {EXAM_STEPS.map((step) => (
                <div
                  key={step.number}
                  className="grid gap-4 border-b border-white/15 py-6 sm:grid-cols-[72px_1fr_auto] sm:items-center"
                >
                  <span className="text-sm font-black text-[#8bc3e5]">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-xl font-black">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#b8c9d4]">
                      {step.description}
                    </p>
                  </div>
                  <span className="hidden text-sm font-bold text-[#88a4b7] sm:block">
                    {step.caption}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="monitoring" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
          <div className="grid gap-10 lg:grid-cols-[.62fr_1.38fr] lg:items-end">
            <div>
              <span className="text-sm font-bold text-[#2f6f9f]">
                Untuk orang tua
              </span>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] md:text-5xl">
                Riwayat dibuat untuk dibaca, bukan sekadar disimpan.
              </h2>
            </div>

            <p className="max-w-xl leading-8 text-[#607585] lg:justify-self-end">
              Tinggi, berat, dan TB/U dapat dibandingkan dari beberapa
              pemeriksaan. Orang tua melihat arah perubahan tanpa harus membaca
              tabel medis yang rumit.
            </p>
          </div>

          <div className="mt-12">
            <GrowthPreview />
          </div>
        </div>
      </section>

      <section className="border-y border-[#d9e1e5] bg-[#f3f6f7]">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
          <div className="grid gap-10 lg:grid-cols-[.62fr_1.38fr] lg:items-end">
            <div>
              <span className="text-sm font-bold text-[#2f6f9f]">
                Untuk petugas
              </span>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] md:text-5xl">
                Tahu kondisi alat tanpa harus berdiri di sampingnya.
              </h2>
            </div>

            <p className="max-w-xl leading-8 text-[#607585] lg:justify-self-end">
              Dashboard menampilkan status koneksi perangkat, pemeriksaan aktif,
              dan insight operasional. Sensor fisik tetap ditandai menunggu
              perangkat sampai hardware benar-benar terhubung.
            </p>
          </div>

          <div className="mt-12">
            <StaffPreview />
          </div>
        </div>
      </section>

      <section className="bg-[#fbfaf6]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[.85fr_1.15fr]">
          <div>
            <ShieldCheck size={30} className="text-[#39765f]" />
            <h2 className="mt-6 max-w-lg text-3xl font-black tracking-[-0.04em] md:text-5xl">
              Skrining membantu melihat tanda awal. Bukan menggantikan tenaga
              kesehatan.
            </h2>
          </div>

          <div className="border-t border-[#cfd9de] pt-7 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
            <p className="max-w-xl text-lg leading-9 text-[#596f7f]">
              StuntSpecula menggunakan hasil pengukuran untuk membantu
              pemantauan pertumbuhan. Hasil yang tampil merupakan skrining dan
              tetap perlu dipahami bersama petugas kesehatan bila membutuhkan
              tindak lanjut.
            </p>

            <div className="mt-10 space-y-4">
              {[
                "TB/U dihitung dari data pemeriksaan, bukan dari kamera.",
                "Kamera tidak digunakan untuk mengenali identitas anak.",
                "Riwayat orang tua bersifat monitoring dan tidak dapat mengubah hasil.",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 border-t border-[#d8e0e4] pt-4"
                >
                  <Check
                    size={18}
                    className="mt-0.5 shrink-0 text-[#39765f]"
                    strokeWidth={2.5}
                  />
                  <p className="text-sm leading-6 text-[#5d7281]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#b43e70] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <span className="text-sm font-bold text-[#ffd9e7]">StuntSpecula</span>
            <h2 className="mt-4 max-w-3xl text-3xl font-black leading-[1.08] tracking-[-0.04em] md:text-5xl">
              Sudah punya akun? Lanjutkan pemantauan perkembangan anak.
            </h2>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/ortu"
              className="inline-flex items-center gap-3 bg-white px-6 py-4 text-sm font-black text-[#8d2e58]"
            >
              Portal orang tua <ArrowRight size={17} />
            </Link>
            <Link
              href="/petugas"
              className="inline-flex items-center gap-3 border border-white/55 px-6 py-4 text-sm font-black text-white"
            >
              <Building2 size={17} /> Akses petugas
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#d9e1e5] bg-[#fbfaf6]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-7 text-sm text-[#687d8c] md:flex-row md:items-center md:justify-between md:px-8">
          <span>StuntSpecula · Pemantauan pertumbuhan anak</span>
          <span>Screening bukan diagnosis medis.</span>
        </div>
      </footer>
    </main>
  );
}
