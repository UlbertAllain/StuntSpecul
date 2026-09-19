# Model A V2.1 — Web Deployment

## Architecture

```text
Camera
→ /api/model-a-screening (Python on Vercel)
→ YuNet robust face detection
→ Quality Gate V1
→ MobileNetV3-Small V2
→ facial screening result
→ examination completion
→ Turso/libSQL
→ mirror + parent portal
```

WHO height-for-age remains the primary stunting screening result. Model A is an experimental facial indicator.

## Install model assets

Place `stuntspecula_model_a_v2_artifacts.zip` in the project root and run:

```powershell
.\scripts\install-model-a.ps1
```

Commit the three generated files under `models/`.

## Database

Run:

```powershell
npm run db:migrate
```

Migration `0005_model_a_face_screening.sql` adds the persisted Model A fields.

## Local verification

The normal `npm run dev` command only starts Next.js. Because Model A uses a Python Vercel Function, use Vercel CLI for the complete stack:

```powershell
npx vercel dev
```

Then check:

```text
GET http://localhost:3000/api/model-a-screening
```

Expected:

```json
{"service":"model-a-v2.1","ready":true,"modelDir":"models"}
```

## Production

Deploy normally to Vercel after the model files are committed.

If the Python function exceeds the standard function package limit, enable this Vercel environment variable and redeploy:

```text
VERCEL_SUPPORT_LARGE_FUNCTIONS=1
```

No child photo is stored by the Model A endpoint. The request bytes are processed in-memory only.
