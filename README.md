# Kesar Bagh Contract Studio

Staff-operated contract workspace for Kesar Bagh Palace.

## Requirements
- Node.js 22.16 or newer
- PostgreSQL database (Supabase supported)

## Setup
1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to the PostgreSQL connection URI from Supabase.
3. Install dependencies with `npm ci`.
4. Start locally with `npm run dev`.

## Tests
- `npm run check`
- `npm test`

Do not commit `.env` or credentials. This app has no built-in authentication; deploy only behind suitable access controls.
