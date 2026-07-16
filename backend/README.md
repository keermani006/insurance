# Backend-only Next.js API — Insurance Claims

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in your Supabase and Gemini credentials

# 3. Run schema
# Paste supabase/schema.sql into Supabase SQL Editor and execute

# 4. Create Storage Bucket
# Supabase Dashboard → Storage → New Bucket
# Name: claims-images | Private: true

# 5. Start dev server
npm run dev

# 6. Type-check
npm run type-check
```

## API Contract

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/claims/upload | Bearer JWT | Upload image, create claim |
| POST | /api/claims/:id/assess | Bearer JWT | Run assessment pipeline |
| GET | /api/claims | Bearer JWT | List own claims (paginated) |
| GET | /api/claims/:id | Bearer JWT | Get single claim |

All endpoints require `Authorization: Bearer <supabase_access_token>`.

## Security Model

- Every route verifies the JWT via Supabase Auth
- Every DB query filters by `user_id` explicitly (not only RLS)
- Images validated by extension + MIME + magic bytes
- EXIF stripped via sharp before upload
- UUID filenames — original filenames never stored
- Rate limited per user (10 uploads/min, 5 assessments/min)
- Double assessment prevented by DB UNIQUE constraint + app check
- Perceptual hash duplicate detection (Hamming distance < 5)
- Gemini receives only structured backend output — never raw user input
- All errors return `{ "error": "..." }` — no stack traces

## Environment Variables

See `.env.example` for the full list. Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `SUPABASE_STORAGE_BUCKET`
