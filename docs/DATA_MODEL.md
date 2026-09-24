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
- birthDate
- sex
- guardian
- parentId
- createdAt

`parentId` boleh null untuk legacy/staff-created record bila flow tersebut masih digunakan.

### `examinations/{id}`

- childId
- childName
- childCode
- parentId
- staffId
- ageMonths
- sex
- deviceId
- deviceName
- status
- cameraEnabled
- heightCm
- weightKg
- measurementUpdatedAt
- measurementSource: iot atau null
- bmi
- captureStatus
- facialStatus
- facialProbability
- facialReason
- facialModelVersion
- createdAt
- completedAt
- finalizedAt

WHO-derived values dikalkulasi dari data examination saat dibaca/dibentuk menjadi response.

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
- child age divalidasi sesuai flow.

## Schema changes

Firestore tidak memiliki migration SQL. Jika field baru ditambahkan:

1. buat field backward-compatible;
2. beri default ketika membaca dokumen lama;
3. update validation;
4. update tests;
5. update dokumen ini.
