# Security

## Trust boundary

Semua data dari browser dianggap tidak dipercaya. Validation dan authorization tetap dilakukan di server walaupun UI sudah membatasi input.

## Authentication

- Password di-hash menggunakan bcrypt.
- Password akun baru minimal 8 karakter dan maksimum 72 byte.
- Session token dibuat random.
- Firestore menyimpan digest token, bukan raw token.
- Session cookie menggunakan HttpOnly dan SameSite.
- Secure aktif pada HTTPS.
- Mutating API dilindungi same-origin request guard.

## Authorization

Parent hanya boleh mengakses data yang terkait dengan parent ID miliknya. Staff memperoleh akses operasional yang diperlukan untuk pemeriksaan dan monitoring. Admin memiliki kemampuan tambahan untuk pengelolaan staff dan monitoring perangkat.

Client-side role check hanya untuk UX. Server tetap menjadi authorization source.

## Google OAuth

Google OAuth menggunakan authorization code flow, server-side client secret, state cookie untuk CSRF protection, verified email check, dan temporary registration token.

GOOGLE*CLIENT_SECRET tidak boleh memakai prefix NEXT_PUBLIC*.

## IoT authentication

ESP32 tidak menggunakan cookie/browser Origin. Semua endpoint /api/iot/\* wajib memanggil device authentication dengan:

    Authorization: Bearer <IOT_API_KEY>

Key dibandingkan menggunakan digest dan constant-time comparison. Jika IOT_API_KEY belum dikonfigurasi, endpoint fail closed dengan 503.

IOT*API_KEY adalah server secret dan tidak boleh memakai prefix NEXT_PUBLIC*.

## Rate limiting

Endpoint auth, registration, dan chat memiliki rate limit berbasis request identity dan time window. Counter disimpan di Firestore.

## Input validation

Zod digunakan untuk request JSON. Perhatikan email normalization, UUID validation, enum validation, panjang string, age constraints, serta image/file type dan size.

## Image handling

Foto wajah screening diproses untuk inference dan tidak disimpan sebagai raw photo pada examination report.

Foto profil menggunakan Cloudinary. Credential signing tetap server-side.

## Secrets

Secret hanya boleh berada di environment:

- Firebase private key
- Cloudinary API secret
- Gemini API key
- Google client secret
- IoT API key

Jangan commit file environment, credential JSON, service-account file, atau API secret.

## Logging

Jangan log raw image, password, auth token, private key, atau OAuth access token. Unexpected server error boleh dilog dengan diagnostic secukupnya tanpa sensitive payload.

## Dependency security

Jalankan:

    npm audit
    npm outdated

Jangan menjalankan npm audit fix --force tanpa review karena dapat melakukan major upgrade.

Python dependency Model A dipin agar runtime reproducible.

## Checklist perubahan sensitif

1. Validation ada di server.
2. Authorization diverifikasi.
3. Cookie/session behavior dicek.
4. Secret tidak masuk client bundle.
5. Error tidak membocorkan credential.
6. Negative-path test ditambahkan bila relevan.
