export function DoodleStar({
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

export function GrowthPreview() {
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
              Supaya ibu tidak cuma melihat satu angka, tapi bisa melihat
              arahnya dari beberapa pemeriksaan.
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

export function StaffPreview() {
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
