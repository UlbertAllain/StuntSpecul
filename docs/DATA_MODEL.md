# Data Model

Firestore adalah persistence utama. Relationship dilakukan melalui ID field dan index document sederhana.

## Entity relationship

```text
parent
└─< child
    └─< examination

staff/admin
└─< staffSession

parent
└─< parentSession

examination
↔ station activeExamId

parent + examination
└─< parentMessage
```

## Collections

### `staff/{id}`

Field utama:

- name
- email
- passwordHash
- role: `admin | staff`
- active
- createdAt

### `staffEmails/{digest(email)}`

Index lookup:

- staffId

### `parents/{id}`

- name
- email
- passwordHash: string atau null untuk Google-only account
- avatarUrl
- avatarPublicId
- active
- createdAt

### `parentEmails/{digest(email)}`

- parentId

### `children/{id}`

- id
- code
- name
- birthDate — sumber umur dinamis; umur saat ini tidak disimpan sebagai field statis
- sex
- guardian
- parentId
- latestFacePhotoUrl
- latestFacePhotoPublicId
- latestFacePhotoUpdatedAt
- createdAt

Satu parent dapat memiliki beberapa child. `parentId` boleh null untuk legacy/staff-created record bila flow tersebut masih digunakan. Foto wajah terbaru disimpan per child dan diperbarui setiap pemeriksaan baru yang berhasil menangkap wajah.

### `examinations/{id}`

- childId
- childName
- childCode
- parentId
- staffId
- ageMonths — snapshot umur pada saat pemeriksaan dibuat; tidak berubah ketika anak bertambah usia
- sex
- deviceId
- deviceName
- measurementMode: device | manual | manual_infant (legacy compatibility)
- status
- cameraEnabled
- heightCm — untuk manual infant menyimpan panjang badan agar tetap backward-compatible
- weightKg
- measurementUpdatedAt
- measurementSource: iot | manual | null
- bmi
- captureStatus
- facialStatus (legacy Model A)
- facialProbability (legacy Model A)
- facialReason (legacy Model A)
- facialModelVersion (legacy Model A)
- visualAnalysis
  - status
  - faceDetected
  - singleFace
  - eyes
  - nose
  - mouth
  - facePosition
  - lighting
  - observations[]
  - reason
  - modelVersion
- recommendations
  - version
  - basedOn
  - trend
  - currentHeightForAgeZ
  - previousHeightForAgeZ
  - trendDelta
  - risk
    - version
    - level
    - label
    - pointsUsed
    - spanDays
    - zChangePer30Days
    - projectionHorizonDays
    - projectedHeightForAgeZ
    - reasons[]
    - disclaimer
  - nutrition[]
  - localizedNutrition
    - version
    - locale
    - ageBand
    - title
    - focus[]
    - foodGroups[]
    - sampleDay[]
    - cautions[]
    - sources[]
  - nextSteps[]
- createdAt
- completedAt
- finalizedAt

Nilai antropometri dikalkulasi dari data examination saat dibaca/dibentuk menjadi response. Usia 0–23 bulan memakai PB/U + BB/U; usia 24–59 bulan memakai TB/U + BB/U. Response juga memuat Z-score linear-growth, BB/U, `measurementQuality`, dan `measurementReason`. Nilai dengan flag WHO biologically implausible tidak diperlakukan sebagai hasil pertumbuhan valid.

`visualAnalysis` adalah hasil observasi Gemini terhadap kualitas foto/visibilitas area wajah. Field ini tidak boleh digunakan untuk menentukan `growthStatus`. Raw photo tidak disimpan pada examination.

### `blogs/{id}`

Artikel edukasi yang dikelola petugas:

- title
- excerpt
- content
- category: nutrition | healthy_habits | stunting_risk | growth
- status: draft | published
- authorId
- authorName
- createdAt
- updatedAt
- publishedAt

Parent hanya menerima artikel berstatus published.

Starter content awal di-seed sekali dari `src/lib/blog-seeds.ts` ketika koleksi blog masih kosong. Marker `config/blogSeed` mencegah artikel starter muncul kembali setelah seluruh artikel sengaja dihapus.

### `staffSessions/{digest(token)}`

- userId
- expiresAt
- createdAt

### `parentSessions/{digest(token)}`

- userId
- expiresAt
- createdAt

### `system/station`

- activeExamId
- updatedAt

Single-station coordination record.

### `devices/{id}`

Status hardware ESP32 untuk monitoring admin:

- name
- active
- lastSeen
- firmwareVersion
- heightSensor
- weightSensor
- claimedExamId
- resetToken
- resetRequestedAt
- createdAt

### `parentMessages/{id}`

- parentId
- examId
- role
- content
- createdAt

### `googleRegistrations/{digest(token)}`

Temporary Google registration state:

- name
- email
- expiresAt
- createdAt

### `rateLimits/{id}`

Counter window untuk endpoint sensitif.

### `config/facility`

Konfigurasi fasilitas.

## Constraints

Enforcement utama dilakukan application layer:

- email unique melalui email-index document;
- child/examination ID memakai UUID;
- examination hanya boleh diakses oleh role/owner yang sesuai;
- active station hanya menunjuk satu examination;
- measurement IoT harus terikat ke examination yang sudah di-claim perangkat; stale session ditolak;
- reset perangkat dari dashboard menerbitkan resetToken baru agar web dan firmware dapat membuang state sementara tanpa menghapus riwayat completed;
- child age divalidasi sesuai flow;
- parent hanya dapat menambahkan, mengedit, dan memakai child miliknya sendiri;
- perubahan profil child tidak menulis ulang snapshot umur/jenis kelamin pada examination lama;
- hasil antropometri ekstrem diflag menggunakan batas plausibility WHO sebelum disimpan sebagai hasil final.

## Schema changes

Firestore tidak memiliki migration SQL. Jika field baru ditambahkan:

1. buat field backward-compatible;
2. beri default ketika membaca dokumen lama;
3. update validation;
4. update tests;
5. update dokumen ini.
