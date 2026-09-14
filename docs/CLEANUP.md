# Cleanup untuk Vercel

- API Next.js menggantikan entrypoint Cloudflare Worker.
- Static export dan rewrite ke Wrangler dihapus.
- Dependensi Wrangler dan workers-types dihapus; SDK libSQL ditambahkan.
- Query contract kecil mempertahankan SQL serta transaksi bisnis.
- Konfigurasi runtime divalidasi terpisah dari router.
- Setup tidak lagi memakai header identitas khusus platform hosting.
- Scripts database/Gemini memakai loader environment dan bundler modul yang sama.
- Skema bisnis, aset, palet, dan flow mirror dipertahankan.
- Panduan deployment dipusatkan di VERCEL.md.

Verifikasi baru mencakup libSQL binding, rollback, foreign key cascade, konfigurasi produksi, serta penolakan setup melalui header palsu. Pengujian backend yang sudah ada tetap dijalankan.
