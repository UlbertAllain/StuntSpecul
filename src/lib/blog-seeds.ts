import type { BlogPostInput } from "./portal";

export type StarterBlogPost = BlogPostInput & {
  id: string;
};

export const STARTER_BLOGS: StarterBlogPost[] = [
  {
    id: "1f6b5078-36b1-4fcb-9ad5-28083054e7e1",
    title: "Kenalan dengan Gizi Seimbang untuk Balita 2–5 Tahun",
    excerpt:
      "Panduan sederhana memahami pola makan beragam, makanan padat gizi, serta kebiasaan makan yang mendukung tumbuh kembang balita.",
    category: "nutrition",
    status: "published",
    content: `Saat anak masuk usia 2–5 tahun, kebutuhan makannya sudah semakin mirip makanan keluarga. Yang penting bukan mengejar satu bahan makanan “super”, tetapi membangun pola makan yang beragam, cukup, aman, dan konsisten.

Kementerian Kesehatan menyediakan panduan Isi Piringku khusus balita 2–5 tahun. Secara praktis, orang tua dapat membiasakan satu kali makan berisi sumber karbohidrat, lauk sumber protein, sayur, dan buah. Pilih variasi bahan yang tersedia di rumah dan sesuaikan jumlahnya dengan usia, aktivitas, serta nafsu makan anak.

Protein tetap penting untuk pertumbuhan. Sumbernya bisa berasal dari telur, ikan, ayam, daging, susu atau olahannya, serta dikombinasikan dengan sumber protein nabati seperti tempe, tahu, dan kacang-kacangan. WHO juga menganjurkan pola makan anak yang beragam dan padat gizi, serta membatasi makanan tinggi gula, garam, lemak trans, dan minuman manis.

Tidak perlu memaksa anak menghabiskan makanan. Tugas orang tua adalah menyediakan pilihan yang baik dan jadwal makan yang teratur; anak belajar mengenali rasa lapar dan kenyangnya. Bila nafsu makan terus menurun, berat tidak bertambah, atau pertumbuhan melambat, diskusikan dengan tenaga kesehatan.

Intinya: variasi lebih penting daripada menu yang “sempurna”. Bangun kebiasaan makan sehat dari menu keluarga yang realistis dan bisa dilakukan setiap hari.

Sumber bacaan: Kementerian Kesehatan RI — Balita Sehat/Isi Piringku untuk Balita 2–5 Tahun; WHO — Healthy diet.`,
  },
  {
    id: "39ebf81a-e49e-4957-8c8f-c6acc47273f4",
    title: "Protein Hewani dan Pertumbuhan Anak: Tidak Harus Mahal",
    excerpt:
      "Telur, ikan, ayam, daging, dan susu merupakan contoh sumber protein hewani. Kenali perannya dan cara memasukkannya ke menu keluarga.",
    category: "nutrition",
    status: "published",
    content: `Protein dibutuhkan tubuh untuk membangun dan memperbaiki jaringan, mendukung pembentukan enzim dan hormon, serta menunjang pertumbuhan. Pada masa balita, kualitas makanan sehari-hari berperan penting karena tubuh sedang tumbuh cepat.

Kementerian Kesehatan menekankan pentingnya sumber protein hewani dalam upaya pencegahan stunting. Contohnya tidak harus bahan mahal: telur, ikan lokal, ayam, daging, susu, yoghurt, atau keju dapat dipilih sesuai ketersediaan, kebiasaan keluarga, dan toleransi anak.

Tidak perlu terpaku pada satu jenis lauk. Variasi membantu anak mengenal rasa dan tekstur sekaligus memperluas jenis zat gizi yang diperoleh. Kombinasikan lauk hewani dengan makanan pokok, sayur, buah, serta sumber protein nabati seperti tempe atau tahu.

Yang perlu dihindari adalah menjadikan minuman manis atau camilan rendah gizi sebagai pengganti makan utama. WHO menganjurkan pola makan anak yang beragam dan membatasi makanan tinggi gula, garam, lemak trans, serta minuman berpemanis.

Jika anak memiliki alergi makanan, kondisi medis tertentu, kesulitan mengunyah atau menelan, atau pertumbuhannya tidak sesuai harapan, pemilihan menu sebaiknya dibicarakan dengan dokter atau tenaga gizi.

Sumber bacaan: Kementerian Kesehatan RI — Protein Hewani Efektif Cegah Anak Alami Stunting; WHO — Healthy diet.`,
  },
  {
    id: "64d0259a-7ee8-4d8d-89bf-4c7254b43608",
    title: "Anak Susah Makan? Kenali Responsive Feeding",
    excerpt:
      "Makan tidak harus menjadi arena negosiasi. Responsive feeding membantu orang tua membaca sinyal lapar dan kenyang tanpa memaksa anak.",
    category: "healthy_habits",
    status: "published",
    content: `Responsive feeding adalah cara memberi makan dengan memperhatikan sinyal lapar dan kenyang anak, lalu meresponsnya dengan tenang dan sesuai tahap perkembangan. WHO dan UNICEF memasukkan pendekatan ini sebagai bagian penting dari pemberian makan anak.

Prinsipnya sederhana: orang tua menyediakan makanan yang sesuai, aman, dan bergizi; anak diberi kesempatan untuk makan dengan dukungan, bukan tekanan. Anak boleh dibantu, diajak bicara, dan diberi waktu. Bila menolak makanan, coba kembali di kesempatan lain atau sajikan dalam kombinasi dan bentuk yang berbeda.

Memaksa, mengejar anak sambil menyuapi, atau menjadikan layar sebagai syarat makan dapat membuat waktu makan semakin sulit. Sebaliknya, jadwal yang cukup konsisten, suasana yang tenang, makan bersama keluarga, dan perhatian pada sinyal kenyang membantu anak belajar mengatur makannya sendiri.

Saat anak sedang sakit, nafsu makan bisa menurun. Tawarkan makanan yang mudah diterima dan cukup cairan. Setelah pulih, kembali ke pola makan beragam dan teratur.

Susah makan tidak selalu berarti anak kekurangan gizi, tetapi perlu diperhatikan bila berlangsung lama, berat badan tidak bertambah, anak tampak lemas, atau ada masalah mengunyah dan menelan. Pada kondisi tersebut, konsultasikan dengan tenaga kesehatan.

Sumber bacaan: WHO & UNICEF — Nurturing young children through responsive feeding; WHO — Infant and young child feeding.`,
  },
  {
    id: "86b8f760-3aa5-438c-a989-87f36cd79f69",
    title: "Habit Bersih yang Ikut Menjaga Tumbuh Kembang Anak",
    excerpt:
      "Gizi yang baik perlu didukung lingkungan yang bersih. Cuci tangan, air aman, dan pengolahan makanan yang benar membantu mencegah infeksi berulang.",
    category: "healthy_habits",
    status: "published",
    content: `Pertumbuhan tidak hanya dipengaruhi makanan. Infeksi berulang, terutama diare, dapat mengganggu asupan dan penyerapan zat gizi. Karena itu kebiasaan bersih merupakan bagian penting dari lingkungan yang mendukung tumbuh kembang.

Biasakan cuci tangan dengan sabun sebelum menyiapkan makanan, sebelum makan, setelah menggunakan toilet, dan setelah membersihkan anak. Anak kecil masih perlu dibantu agar seluruh bagian tangan terkena sabun dan dibilas dengan air bersih.

Gunakan air yang aman untuk minum dan menyiapkan makanan. Jaga alat makan tetap bersih, pisahkan bahan mentah dari makanan matang, masak makanan hingga benar-benar matang, dan simpan makanan dengan aman.

WHO menyebut air minum yang aman, sanitasi yang baik, cuci tangan dengan sabun, serta higiene makanan sebagai langkah penting untuk mencegah penyakit diare. UNICEF Indonesia juga menekankan bahwa WASH — air, sanitasi, dan kebersihan — berkaitan erat dengan kesehatan dan gizi anak.

Bila anak mengalami diare berkepanjangan, ada darah pada tinja, tidak mau minum, atau menunjukkan tanda dehidrasi, segera cari pertolongan tenaga kesehatan. Kebersihan adalah pencegahan, bukan pengganti penanganan medis saat anak sakit.

Sumber bacaan: WHO — Diarrhoeal disease dan Guidance on WASH and health; UNICEF Indonesia — Water, sanitation and hygiene.`,
  },
  {
    id: "b3fc2a68-cf49-4bfd-86a1-48188af084a2",
    title: "Jangan Menilai Pertumbuhan dari Sekali Ukur",
    excerpt:
      "Satu angka tinggi atau berat belum menceritakan semuanya. Riwayat pengukuran membantu orang tua melihat arah pertumbuhan anak dari waktu ke waktu.",
    category: "growth",
    status: "published",
    content: `Pengukuran tinggi dan berat badan memberi informasi penting, tetapi satu hasil tidak selalu cukup untuk memahami pola pertumbuhan. Posisi saat diukur, ketepatan alat, usia yang dicatat, dan kondisi anak dapat memengaruhi interpretasi.

WHO menyediakan standar pertumbuhan anak hingga usia 5 tahun, termasuk tinggi menurut umur, berat menurut umur, berat menurut tinggi, dan IMT menurut umur. Untuk StuntSpecula, indikator utama skrining stunting adalah tinggi badan menurut umur atau TB/U.

Karena itu, simpan hasil setiap pemeriksaan dan perhatikan trennya. Apakah tinggi terus bertambah? Apakah Z-score TB/U relatif stabil, membaik, atau justru menurun? Tren membantu memberi konteks yang tidak terlihat dari satu angka saja.

Jika hasil tampak tidak sesuai, pengukuran sebaiknya diulang dengan teknik yang benar. Bila TB/U berada di bawah rentang yang diharapkan atau trennya menurun, bawa riwayat pengukuran saat datang ke Posyandu, Puskesmas, dokter, atau tenaga kesehatan agar dapat dinilai bersama informasi lain seperti pola makan, riwayat penyakit, dan perkembangan anak.

Grafik pertumbuhan adalah alat pemantauan, bukan diagnosis mandiri. Keputusan klinis tetap perlu mempertimbangkan pemeriksaan langsung oleh tenaga kesehatan.

Sumber bacaan: WHO — Child Growth Standards dan Length/height-for-age; Kementerian Kesehatan RI — Balita Sehat.`,
  },
];
