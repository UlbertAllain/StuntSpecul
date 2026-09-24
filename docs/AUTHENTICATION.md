# Authentication

## Roles

StuntSpecula memiliki tiga role:

- `parent`
- `staff`
- `admin`

Login menggunakan satu halaman: `/login`.

## Password policy

Semua akun baru menggunakan:

- minimum 8 karakter;
- maksimum 72 byte;
- bcrypt hash;
- plaintext password tidak disimpan.

Login tidak memaksakan minimum registrasi agar akun existing tetap kompatibel.

## Session

Session menggunakan random token yang disimpan dalam HttpOnly cookie.

### Staff/admin

Cookie:

```text
ss_staff
```

TTL: 8 jam.

Firestore:

```text
staffSessions/{sha256(token)}
```

### Parent

Cookie:

```text
ss_parent_account
```

TTL: 30 hari.

Firestore:

```text
parentSessions/{sha256(token)}
```

Cookie menggunakan HttpOnly, SameSite, dan Secure di HTTPS.

## Login password

```text
POST /api/auth/unified-login
→ cari staff/admin by email
→ verify bcrypt
→ jika tidak cocok cari parent
→ create role session
→ redirect sesuai role
```

## Google login

Google OAuth memakai Authorization Code flow server-side.

```text
/login
→ GET /api/auth/google/start
→ Google consent/account picker
→ GET /api/auth/google/callback
→ token exchange server-side
→ verified Google email
→ match email StuntSpecula
→ create StuntSpecula session
```

OAuth state disimpan pada HttpOnly temporary cookie untuk proteksi CSRF.

### Existing account

Jika email Google sudah ada pada staff/admin/parent, user masuk ke role tersebut.

### Parent registration with Google

```text
Daftar dengan Google
→ OAuth
→ verified name + email
→ temporary registration record
→ parent melengkapi data anak
→ POST /api/parent-account/register-google
→ parent + child dibuat
→ parent session dibuat
```

Google-only parent memiliki `passwordHash = null` dan login password tidak dapat digunakan untuk akun tersebut.

## Firebase Authentication note

Firebase Authentication Google provider boleh diaktifkan untuk project yang sama, tetapi aplikasi saat ini memakai OAuth callback server-side dan session StuntSpecula sendiri. Jangan mencampur Firebase client session sebagai authorization source tanpa migrasi auth yang eksplisit.

## Admin setup

`POST /api/auth/setup` hanya tersedia dari localhost dan hanya ketika admin belum ada.

## Staff provisioning

Tidak ada public staff registration. Admin membuat staff melalui:

```text
POST /api/staff
```

## Security rules

- email dinormalisasi lowercase;
- request mutating harus same-origin;
- login/register memiliki rate limit;
- role selalu diverifikasi server-side;
- client route bukan authorization boundary.
