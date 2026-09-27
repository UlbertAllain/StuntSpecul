# Troubleshooting

## Analisis visual Gemini belum tersedia

Buka Network tab pada tahap kamera dan periksa POST /api/visual-analysis.

Common case:

- 503 visual_not_configured: GEMINI_API_KEY/GEMINI_MODEL belum lengkap.
- 429 visual_quota_exceeded: quota provider habis.
- 413: foto terlalu besar.
- 422 visual_context_invalid: TB/BB/usia/sex belum lengkap.
- visual_timeout / visual_network_error: provider tidak merespons.

WHO screening tetap harus selesai karena AI visual hanya pendukung.

## Model A legacy

GET/POST /api/model-a-screening hanya relevan untuk rollback/audit flow lama. Endpoint ini bukan jalur kamera aktif.

## Google belum terhubung

Pastikan Vercel memiliki GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET.

Redirect URI harus persis:

    https://stuntspecula.vercel.app/api/auth/google/callback

## Google redirect_uri_mismatch

Bandingkan protocol, hostname, path, dan trailing slash. Google melakukan exact redirect URI matching.

## Parent memulai tetapi alat tidak jalan

Expected flow:

    parent start
    → /api/station/active
    → /api/station/claim
    → prepare

Check Network pada /alat untuk polling station/active dan POST station/claim. Tidak ada tombol Aku siap pada flow normal.

## Station tetap terkunci

Cek examination yang completed tetapi belum finalized. Finalization harus release active station jika examination ID cocok.

## Login password setelah policy berubah

Policy 8 karakter berlaku untuk pembuatan akun baru. Login existing hanya mewajibkan password terisi dan tetap memverifikasi hash existing.

## Firestore not configured

Pastikan FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, dan FIREBASE_PRIVATE_KEY tersedia. Private key harus mempertahankan newline escape.

## Gemini unavailable

Pastikan GEMINI_MODEL tersedia untuk API/version yang digunakan. Jika Gemini gagal, screening dan result utama tetap harus bekerja.

## Vercel build rate limit

Jangan klik redeploy berulang.

Gunakan pola:

    audit
    → batch changes
    → verify
    → one update to main
    → wait

## Mobile layout stale

Setelah deployment Ready, refresh, tutup tab dan buka ulang bila perlu, lalu pastikan production alias menunjuk commit terbaru.

## Build gagal setelah refactor path

Cari import lama ke path yang sudah dipindah. Route page harus mengarah ke folder domain baru di src/components.
