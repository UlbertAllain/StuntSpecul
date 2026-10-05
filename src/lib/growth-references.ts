export const WHO_LENGTH_HEIGHT_REFERENCE_URL =
  "https://www.who.int/toolkits/child-growth-standards/standards/length-height-for-age";

export const KEMENKES_ANTHROPOMETRY_REFERENCE_URL =
  "https://jdih.kemkes.go.id/documents/peraturan-menteri-kesehatan-nomor-2-tahun-2020";

export const KIA_2024_REFERENCE_URL =
  "https://kesprimkom.kemkes.go.id/konten/146/143/0/buku-kesehatan-ibu-dan-anak-kia";

export const SCREENING_REFERENCES = [
  {
    label: "Kemenkes RI — Permenkes No. 2 Tahun 2020",
    description: "Standar Antropometri Anak dan kategori status gizi.",
    url: KEMENKES_ANTHROPOMETRY_REFERENCE_URL,
    role: "calculation" as const,
  },
  {
    label: "WHO Child Growth Standards",
    description: "Kurva dan tabel panjang/tinggi menurut umur anak 0–5 tahun.",
    url: WHO_LENGTH_HEIGHT_REFERENCE_URL,
    role: "calculation" as const,
  },
  {
    label: "Kemenkes RI — Buku KIA Edisi 2024",
    description:
      "Referensi pemantauan pertumbuhan dan pencatatan kesehatan anak untuk keluarga dan tenaga kesehatan.",
    url: KIA_2024_REFERENCE_URL,
    role: "supporting" as const,
  },
] as const;
