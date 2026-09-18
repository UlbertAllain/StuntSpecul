import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  ShieldCheck,
  Star,
} from "lucide-react";

import { KidMissionPlayground } from "./kid-mission-playground";

const JOURNEY = [
  {
    number: "1",
    title: "Petugas pilih anak",
    text: "Data anak dipilih dulu dari dashboard.",
    color: "#DDF2FF",
    accent: "#72B8E6",
    rotate: "-rotate-1",
  },
  {
    number: "2",
    title: "Mimo menemani",
    text: "Anak mengikuti tiga langkah sederhana.",
    color: "#FFE3EE",
    accent: "#FF8EB8",
    rotate: "rotate-1",
  },
  {
    number: "3",
    title: "Hasil tersimpan",
    text: "Pemeriksaan masuk ke riwayat anak.",
    color: "#FFF0C8",
    accent: "#F2B84B",
    rotate: "-rotate-1",
  },
  {
    number: "4",
    title: "Orang tua memantau",
    text: "Perkembangan bisa dilihat lagi dari rumah.",
    color: "#DFF3E8",
    accent: "#79C89B",
    rotate: "rotate-1",
  },
] as const;

function DoodleStar({
  className,
  color,
}: {
  className: string;
  color: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`absolute h-8 w-8 ${className}`}
      style={{
        background: color,
        clipPath:
          "polygon(50% 0,61% 36%,100% 50%,61% 64%,50% 100%,39% 64%,0 50%,39% 36%)",
      }}
    />
  );
}

function GrowthPreview() {
  return (
    <div className="overflow-hidden rounded-[2.6rem_1.7rem_2.8rem_1.9rem] border-[3px] border-[#18334d] bg-white shadow-[8px_9px_0_#18334d]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-[3px] border-[#18334d] bg-[#DDF2FF] px-6 py-5">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[#4d7794]">
            Buku tumbuh Aira
          </span>
          <h3 className="mt-1 text-2xl font-black text-[#18334d]">
            Perkembangan anak
          </h3>
        </div>
        <span className="rotate-2 rounded-full border-2 border-[#18334d] bg-[#fff4a8] px-4 py-2 text-xs font-black text-[#18334d]">
          6 pemeriksaan
        </span>
      </div>

      <div className="grid lg:grid-cols-[.72fr_1.28fr]">
        <div className="border-b-[3px] border-[#18334d] lg:border-b-0 lg:border-r-[3px]">
          {[
            ["94.2 cm", "Tinggi", "+1.8 cm"],
            ["13.8 kg", "Berat", "+0.6 kg"],
            ["-1.42 SD", "TB/U", "Perlu dipantau"],
          ].map(([value, label, note], index) => (
            <div
              key={label}
              className={
                index === 2
                  ? "p-6"
                  : "border-b-2 border-dashed border-[#b9cbd7] p-6"
              }
            >
              <span className="text-xs font-black uppercase tracking-[0.1em] text-[#698091]">
                {label}
              </span>
              <strong className="mt-2 block text-3xl font-black tracking-[-0.03em] text-[#18334d]">
                {value}
              </strong>
              <span className="mt-2 inline-block rounded-full bg-[#F3F8FB] px-3 py-1 text-xs font-bold text-[#567084]">
                {note}
              </span>
            </div>
          ))}
        </div>

        <div className="relative p-6 md:p-8">
          <DoodleStar className="right-7 top-6 rotate-12" color="#FFD55E" />

          <div className="pr-12">
            <span className="text-xs font-black uppercase tracking-[0.1em] text-[#698091]">
              Grafik TB/U
            </span>
            <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-[#5d7485]">
              Supaya ibu tidak cuma melihat satu angka, tapi bisa melihat arahnya
              dari beberapa pemeriksaan.
            </p>
          </div>

          <svg
            className="mt-8 h-56 w-full text-[#4E8BC4]"
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
                strokeOpacity="0.12"
                strokeDasharray="7 7"
              />
            ))}
            <line
              x1="30"
              x2="500"
              y1="165"
              y2="165"
              stroke="#B43E70"
              strokeWidth="2"
              strokeDasharray="8 7"
            />
            <text
              x="498"
              y="157"
              textAnchor="end"
              fontSize="11"
              fontWeight="800"
              fill="#B43E70"
            >
              -2 SD
            </text>

            <polyline
              points="40,150 130,138 220,124 310,108 400,92 490,82"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
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
            ].map(([x, y], index) => (
              <g key={`${x}-${y}`}>
                <circle
                  cx={x}
                  cy={y}
                  r="10"
                  fill={index === 5 ? "#FFD55E" : "#ffffff"}
                  stroke="#18334d"
                  strokeWidth="3"
                />
              </g>
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
                fontWeight="700"
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
    <div className="overflow-hidden rounded-[2.2rem] border-[3px] border-[#18334d] bg-[#17324d] text-white shadow-[8px_9px_0_#8fc9ea]">
      <div className="grid min-h-[430px] md:grid-cols-[180px_1fr]">
        <aside className="border-b border-white/15 bg-[#132c42] p-5 md:border-b-0 md:border-r">
          <strong className="block text-lg font-black">StuntSpecula</strong>
          <span className="mt-1 block text-xs font-semibold text-[#9fb8c9]">
            Puskesmas
          </span>

          <div className="mt-9 hidden space-y-5 text-sm md:block">
            <span className="block font-black text-white">Dashboard</span>
            <span className="block text-[#9fb8c9]">Data anak</span>
            <span className="block text-[#9fb8c9]">Pemeriksaan</span>
            <span className="block text-[#9fb8c9]">Monitoring alat</span>
            <span className="block text-[#9fb8c9]">Insight</span>
          </div>
        </aside>

        <div>
          <div className="flex items-center justify-between gap-4 border-b border-white/15 px-6 py-5">
            <div>
              <span className="block text-xs font-bold uppercase tracking-[0.12em] text-[#9fb8c9]">
                Station 01
              </span>
              <strong className="mt-1 block text-xl font-black">
                Monitoring alat
              </strong>
            </div>
            <span className="flex items-center gap-2 rounded-full bg-[#244a60] px-3 py-2 text-xs font-black text-[#91dfba]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#6dd2a4]" />
              Online
            </span>
          </div>

          <div className="grid md:grid-cols-[1.08fr_.92fr]">
            <div className="border-b border-white/15 p-6 md:border-b-0 md:border-r">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#9fb8c9]">
                Kondisi sekarang
              </span>
              <strong className="mt-8 block text-4xl font-black">
                Siap digunakan
              </strong>
              <p className="mt-3 max-w-sm text-sm font-semibold leading-6 text-[#bdd0dc]">
                Layar alat masih terhubung dan tidak ada pemeriksaan aktif.
              </p>

              <dl className="mt-9 space-y-4 text-sm">
                <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                  <dt className="text-[#9fb8c9]">Terakhir terhubung</dt>
                  <dd className="font-black">baru saja</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                  <dt className="text-[#9fb8c9]">Sensor tinggi</dt>
                  <dd className="font-black">Menunggu alat</dd>
                </div>
                <div className="flex justify-between gap-4 pb-3">
                  <dt className="text-[#9fb8c9]">Sensor berat</dt>
                  <dd className="font-black">Menunggu alat</dd>
                </div>
              </dl>
            </div>

            <div className="bg-[#1d3b54] p-6">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#9fb8c9]">
                30 hari
              </span>
              <div className="mt-7">
                <strong className="text-5xl font-black">52</strong>
                <span className="ml-2 text-sm text-[#afc3d0]">pemeriksaan</span>
              </div>

              <div className="mt-9 space-y-5">
                {[
                  ["Selesai", "44", "84%"],
                  ["Perlu dipantau", "6", "12%"],
                  ["Tindak lanjut", "2", "4%"],
                ].map(([label, value, width]) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-[#b6c7d2]">
                        {label}
                      </span>
                      <strong>{value}</strong>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[#79bde6]"
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

export function PublicLanding() {
  return (
    <main className="min-h-svh overflow-hidden bg-[#FFFDF7] text-[#18334d]">
      <header className="relative z-30 border-b-[3px] border-[#18334d] bg-[#FFFDF7]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-3 md:px-8">
          <Link href="/" aria-label="StuntSpecula" className="shrink-0">
            <Image
              src="/images/stuntspecula-logo.jpeg"
              alt="StuntSpecula"
              width={1536}
              height={1024}
              className="h-12 w-36 object-contain mix-blend-multiply md:h-14 md:w-40"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-black text-[#536c7f] lg:flex">
            <a href="#kenalan" className="transition hover:-rotate-1 hover:text-[#18334d]">
              Kenalan
            </a>
            <a href="#cara-kerja" className="transition hover:rotate-1 hover:text-[#18334d]">
              Cara kerja
            </a>
            <a href="#orang-tua" className="transition hover:-rotate-1 hover:text-[#18334d]">
              Untuk orang tua
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/petugas"
              className="hidden text-sm font-black text-[#587185] sm:inline"
            >
              Petugas
            </Link>
            <Link
              href="/ortu"
              className="inline-flex items-center gap-2 rounded-[1.2rem] border-[3px] border-[#18334d] bg-[#FFB4D0] px-4 py-2.5 text-sm font-black text-[#18334d] shadow-[3px_4px_0_#18334d] transition hover:-translate-y-0.5 hover:shadow-[4px_6px_0_#18334d]"
            >
              Masuk orang tua <ArrowRight size={16} strokeWidth={3} />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative bg-[#CDEBFF]">
        <DoodleStar className="left-[4%] top-12 rotate-12" color="#FFD55E" />
        <DoodleStar className="right-[5%] top-28 -rotate-12" color="#FF8EB8" />

        <div
          className="absolute left-[8%] top-[45%] hidden h-12 w-12 rounded-full border-[6px] border-[#4E8BC4] md:block"
          aria-hidden="true"
        />
        <div
          className="absolute right-[10%] bottom-12 hidden h-5 w-24 rotate-[-8deg] rounded-full bg-[#FFD55E] md:block"
          aria-hidden="true"
        />

        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 md:px-8 md:py-20 lg:grid-cols-[.88fr_1.12fr] lg:items-center">
          <div className="relative z-10">
            <div className="inline-block -rotate-2 rounded-[1.4rem_1.4rem_1.4rem_.35rem] border-[3px] border-[#18334d] bg-white px-4 py-2 shadow-[3px_4px_0_#18334d]">
              <span className="text-sm font-black text-[#2f6f9f]">
                Halo, kenalan sama Mimo! 👋
              </span>
            </div>

            <h1 className="mt-7 max-w-3xl text-[3.4rem] font-black leading-[.93] tracking-[-0.055em] sm:text-[4.7rem] lg:text-[5.6rem]">
              Cek tumbuh
              <span className="relative ml-3 inline-block text-[#B43E70]">
                kembang
                <span
                  className="absolute -bottom-2 left-1 right-1 h-3 -rotate-1 rounded-full bg-[#FFD55E]"
                  aria-hidden="true"
                />
              </span>
              <span className="block mt-3">jadi lebih seru.</span>
            </h1>

            <p className="mt-7 max-w-xl text-base font-semibold leading-8 text-[#4f687b] md:text-lg">
              Anak ditemani Mimo saat pemeriksaan. Orang tua tetap bisa melihat
              hasil dan perkembangan anak setelah pulang.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#cara-kerja"
                className="inline-flex items-center gap-3 rounded-[1.4rem] border-[3px] border-[#18334d] bg-[#FFD55E] px-6 py-4 text-sm font-black text-[#18334d] shadow-[5px_6px_0_#18334d] transition hover:-translate-y-1 hover:shadow-[6px_8px_0_#18334d]"
              >
                Lihat cara kerjanya <ArrowRight size={18} strokeWidth={3} />
              </a>
              <span className="rotate-2 rounded-full border-2 border-[#18334d] bg-white px-4 py-2 text-xs font-black">
                cuma 3 langkah ✨
              </span>
            </div>
          </div>

          <KidMissionPlayground />
        </div>

        <svg
          className="-mb-1 block w-full"
          viewBox="0 0 1440 95"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0 38C173 82 334 8 508 30C733 58 814 105 1040 64C1182 38 1318 18 1440 46V95H0Z"
            fill="#FFFDF7"
          />
        </svg>
      </section>

      <section id="kenalan" className="relative bg-[#FFFDF7]">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
          <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr] lg:items-center">
            <div className="relative min-h-[390px]">
              <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-[44%_56%_63%_37%] bg-[#FFE3EE]" />
              <div className="absolute left-[16%] top-[15%] h-8 w-8 rounded-full bg-[#FFD55E]" />
              <div className="absolute right-[18%] top-[24%] h-4 w-16 rotate-12 rounded-full bg-[#8FD0F2]" />
              <Image
                src="/images/mimo-cheer.png"
                alt="Mimo bersorak"
                width={800}
                height={800}
                className="absolute left-1/2 top-1/2 z-10 h-80 w-80 -translate-x-1/2 -translate-y-1/2 object-contain"
              />
              <span className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2 rotate-[-3deg] rounded-[1.2rem] border-[3px] border-[#18334d] bg-white px-4 py-2 text-sm font-black shadow-[4px_5px_0_#18334d]">
                “Aku temenin, ya!”
              </span>
            </div>

            <div>
              <span className="text-sm font-black text-[#2F6F9F]">
                StuntSpecula itu apa?
              </span>
              <h2 className="mt-4 max-w-3xl text-3xl font-black leading-[1.05] tracking-[-0.045em] md:text-5xl">
                Alat pemeriksaan yang dibuat supaya anak tidak merasa sedang
                menghadapi mesin yang kaku.
              </h2>
              <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-[#5b7182]">
                Mimo memberi arahan sederhana di layar. Petugas tetap mengontrol
                pemeriksaan, sedangkan hasilnya tersimpan agar orang tua bisa
                memantau perkembangan dari waktu ke waktu.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {["ramah anak", "dipandu petugas", "riwayat tersimpan"].map(
                  (item, index) => (
                    <span
                      key={item}
                      className={`rounded-full border-2 border-[#18334d] px-4 py-2 text-sm font-black ${[
                        "bg-[#DDF2FF]",
                        "bg-[#FFF0C8]",
                        "bg-[#DFF3E8]",
                      ][index]}`}
                    >
                      {item}
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="cara-kerja" className="relative bg-[#FFF0C8]">
        <svg
          className="-mt-1 block w-full"
          viewBox="0 0 1440 70"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0 22C217 67 392 5 602 25C823 46 1000 80 1440 18V0H0Z"
            fill="#FFFDF7"
          />
        </svg>

        <div className="mx-auto max-w-7xl px-5 pb-20 pt-10 md:px-8 md:pb-28">
          <div className="max-w-3xl">
            <span className="text-sm font-black text-[#9A6920]">
              Dari alat sampai rumah
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.045em] md:text-5xl">
              Satu perjalanan kecil untuk satu riwayat yang panjang.
            </h2>
          </div>

          <div className="relative mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <div
              className="absolute left-[8%] right-[8%] top-16 hidden border-t-[4px] border-dashed border-[#C99D42] lg:block"
              aria-hidden="true"
            />
            {JOURNEY.map((item) => (
              <article
                key={item.number}
                className={`relative z-10 min-h-56 rounded-[2rem_1.3rem_2.3rem_1.5rem] border-[3px] border-[#18334d] p-6 shadow-[6px_7px_0_#18334d] ${item.rotate}`}
                style={{ background: item.color }}
              >
                <span
                  className="grid h-12 w-12 place-items-center rounded-full border-[3px] border-[#18334d] text-lg font-black text-[#18334d]"
                  style={{ background: item.accent }}
                >
                  {item.number}
                </span>
                <h3 className="mt-6 text-xl font-black">{item.title}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-[#566e80]">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="orang-tua" className="bg-[#FFFDF7]">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
          <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
            <div>
              <span className="inline-block -rotate-2 rounded-full bg-[#FFB4D0] px-4 py-2 text-sm font-black">
                Untuk ibu & ayah
              </span>
              <h2 className="mt-5 text-3xl font-black tracking-[-0.045em] md:text-5xl">
                Bukan cuma “hasil hari ini”.
              </h2>
            </div>
            <p className="max-w-xl text-base font-semibold leading-8 text-[#607585] lg:justify-self-end">
              Riwayat dibuat seperti buku tumbuh digital: lebih mudah melihat
              tinggi, berat, dan TB/U dari beberapa pemeriksaan sekaligus.
            </p>
          </div>

          <div className="mt-12">
            <GrowthPreview />
          </div>
        </div>
      </section>

      <section className="relative bg-[#DDF2FF]">
        <DoodleStar className="left-[5%] top-20 -rotate-12" color="#FF8EB8" />
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
          <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
            <div>
              <span className="inline-block rotate-1 rounded-full bg-[#FFD55E] px-4 py-2 text-sm font-black">
                Untuk petugas
              </span>
              <h2 className="mt-5 text-3xl font-black tracking-[-0.045em] md:text-5xl">
                Alatnya tetap bisa dipantau dari dashboard.
              </h2>
            </div>
            <p className="max-w-xl text-base font-semibold leading-8 text-[#587184] lg:justify-self-end">
              Status koneksi, pemeriksaan aktif, dan insight fasilitas tetap
              dibuat profesional. Bagian anak boleh seru; bagian operasional
              tetap jelas.
            </p>
          </div>

          <div className="mt-12">
            <StaffPreview />
          </div>
        </div>
      </section>

      <section className="bg-[#18334d] text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-8 md:py-24 lg:grid-cols-[.82fr_1.18fr]">
          <div>
            <div className="grid h-16 w-16 place-items-center rounded-full border-[3px] border-white bg-[#79C89B] text-[#18334d]">
              <ShieldCheck size={30} strokeWidth={2.5} />
            </div>
            <h2 className="mt-6 max-w-xl text-3xl font-black tracking-[-0.04em] md:text-5xl">
              Seru untuk anak, tetap bertanggung jawab untuk hasil.
            </h2>
          </div>

          <div className="border-t border-white/20 pt-7 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
            <p className="max-w-xl text-lg font-semibold leading-9 text-[#c8d8e3]">
              StuntSpecula membantu skrining pertumbuhan. Hasilnya bukan
              diagnosis medis dan tetap perlu dipahami bersama tenaga kesehatan
              bila membutuhkan tindak lanjut.
            </p>

            <div className="mt-9 space-y-4">
              {[
                "TB/U dihitung dari data pengukuran, bukan dari kamera.",
                "Kamera tidak digunakan untuk mengenali identitas anak.",
                "Orang tua dapat memantau, tetapi tidak dapat mengubah hasil.",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 border-t border-white/15 pt-4"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#79C89B] text-[#18334d]">
                    <Check size={15} strokeWidth={3} />
                  </span>
                  <p className="text-sm font-semibold leading-6 text-[#c4d4df]">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative bg-[#FFB4D0]">
        <div
          className="absolute left-[7%] top-10 h-10 w-10 rounded-full bg-[#FFD55E]"
          aria-hidden="true"
        />
        <Star
          className="absolute right-[8%] top-10 rotate-12 fill-[#FFF0A8] text-[#18334d]"
          size={42}
          strokeWidth={2.5}
          aria-hidden="true"
        />

        <div className="mx-auto grid max-w-7xl gap-9 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-center gap-5">
            <Image
              src="/images/mimo-cheer.png"
              alt="Mimo"
              width={500}
              height={500}
              className="hidden h-32 w-32 shrink-0 object-contain sm:block"
            />
            <div>
              <span className="text-sm font-black text-[#7f2b50]">
                Sampai ketemu lagi!
              </span>
              <h2 className="mt-2 max-w-3xl text-3xl font-black leading-[1.05] tracking-[-0.04em] text-[#18334d] md:text-5xl">
                Sudah punya akun? Yuk lihat perkembangan anak.
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/ortu"
              className="inline-flex items-center gap-3 rounded-[1.4rem] border-[3px] border-[#18334d] bg-white px-6 py-4 text-sm font-black text-[#18334d] shadow-[5px_6px_0_#18334d]"
            >
              Portal orang tua <ArrowRight size={17} strokeWidth={3} />
            </Link>
            <Link
              href="/petugas"
              className="inline-flex items-center gap-3 rounded-[1.4rem] border-[3px] border-[#18334d] bg-[#FFD55E] px-6 py-4 text-sm font-black text-[#18334d]"
            >
              <Building2 size={17} strokeWidth={3} /> Petugas
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t-[3px] border-[#18334d] bg-[#FFFDF7]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-sm font-semibold text-[#687d8c] md:flex-row md:items-center md:justify-between md:px-8">
          <span>StuntSpecula · Pemantauan pertumbuhan anak</span>
          <span>Screening bukan diagnosis medis.</span>
        </div>
      </footer>
    </main>
  );
}
