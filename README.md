# FinanceApp — Aplikasi Manajemen Keuangan Pribadi

Aplikasi web pencatatan arus kas harian (pemasukan & pengeluaran) dengan fitur pemindaian struk belanja via OCR/AI Vision. Dibangun dengan SvelteKit + Svelte 5 (runes), TypeScript, dan Tailwind CSS v4, mengikuti arsitektur *feature-based modular* ala Angular.

## Tech Stack

- **Framework:** SvelteKit 3 + Svelte 5 (runes mode)
- **Bahasa:** TypeScript
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/vite`)
- **State:** Svelte runes ($state/$derived) yang dienkapsulasi per modul fitur
- **Database:** PostgreSQL 14+ (driver `postgres` / postgres.js)

## Backend & Database

Backend memakai endpoint API SvelteKit (`src/routes/api/`) yang berbicara langsung ke PostgreSQL sesuai ERD: `users`, `wallets`, `categories`, `transactions`, `transaction_items`, `budgets`, `budget_alerts`, dan `recurring_transactions` (lihat `server/schema.sql`).

### Menjalankan Database

```sh
docker compose up -d db        # PostgreSQL 16 + schema + seed data demo otomatis
cp .env.example .env           # DB_* + AUTH_SECRET (untuk login)
npm run dev
```

- Skema lengkap (CHECK constraints, composite index, trigger `updated_at`) ada di `server/schema.sql`; data demo ada di `server/seed.sql`.
- Variabel env dideklarasikan di `src/env.ts` (Kit 3 explicit env) dan dibaca via `$app/env/private`.
- Data demo (user seed) tidak memiliki password; buat akun sendiri lewat halaman **Daftar**.

### API Endpoint

| Endpoint | Metode | Fungsi |
| --- | --- | --- |
| `/api/wallets` | GET | Daftar dompet + saldo terkini |
| `/api/categories` | GET | Kategori sistem + milik user |
| `/api/transactions` | GET/POST | Riwayat per bulan (`?month=YYYY-MM&query=`) & simpan transaksi |
| `/api/transactions/[id]` | PUT/DELETE | Ubah (re-create atomik) & hapus dengan pembalikan saldo |
| `/api/dashboard/summary` | GET | Cashflow, breakdown kategori, total saldo, status budget |
| `/api/budgets` | GET/POST | Status budget real-time & buat aturan budget |
| `/api/receipts/parse` | POST | Ekstraksi struk (multipart field `receipt`) |
| `/api/health` | GET | Cek konektivitas aplikasi + database (untuk verifikasi deployment) |
| `/api/auth/register` | POST | Daftar akun baru (nama, email, password) — otomatis login + dompet awal |
| `/api/auth/login` | POST | Masuk (email + password) → session cookie httpOnly 7 hari |
| `/api/auth/logout` | POST | Keluar (hapus cookie session) |
| `/api/auth/me` | GET | Profil user yang sedang login |
| `/api/admin/users` | GET | (Admin) Daftar semua akun + statistik data, cari via `?query=` |
| `/api/admin/users/[id]` | PATCH | (Admin) Blokir/buka blokir (dengan alasan) & ubah role |
| `/api/admin/categories` | GET/POST | (Admin) Semua kategori + pemakaian; buat kategori sistem |
| `/api/admin/categories/[id]` | PATCH/DELETE | (Admin) Edit nama/warna & hapus kategori sistem (dijaga dari pemakaian) |
| `/api/admin/wallet-types` | GET/POST | (Admin) Semua tipe dompet + jumlah pemakaian; buat tipe baru |
| `/api/admin/wallet-types/[code]` | PATCH/DELETE | (Admin) Edit label/aktif & hapus tipe dompet |

### Deployment: Supabase + Vercel

Adapter build adalah `@sveltejs/adapter-vercel` — semua endpoint `/api/*` berjalan sebagai Vercel Functions.

**1. Buat database di Supabase**

- Buat project baru di [supabase.com](https://supabase.com).
- Jalankan skema: **SQL Editor** → tempel seluruh isi `server/schema.sql` → Run. (Opsional: jalankan `server/seed.sql` untuk data demo.)
- **Database lama yang sudah jalan** (sebelum fitur admin): jalankan `server/migrations/001_admin_and_wallet_types.sql` — menambah kolom `role`/`is_blocked`/`block_reason` pada `users`, membuat tabel `wallet_types`, mengubah `wallets.type` menjadi FK, dan mengangkat user demo menjadi admin.

**2. Ambil parameter koneksi**

Koneksi memakai env variable terpisah, bukan satu connection string. Ambil datanya dari **Project Settings → Database → Connection string → URI**. Untuk Vercel (serverless), pakai **Connection pooling** (transaction pooler, port `6543`):

- Host: `aws-0-<region>.pooler.supabase.com` (pooler) atau `db.<project-ref>.supabase.co` (direct)
- Port: `6543` untuk pooler (direkomendasikan untuk Vercel) atau `5432` untuk direct
- User: `postgres.<project-ref>` (format pooler Supabase)
- Database: `postgres`

> Driver `postgres.js` di aplikasi ini sudah dikonfigurasi dengan `prepare: false` — **wajib** untuk transaction pooler Supabase (PgBouncer). SSL juga diaktifkan otomatis untuk host non-lokal.

**3. Daftarkan env var di Vercel**

**Project Settings → Environment Variables** → tambahkan (aktifkan untuk Production, Preview, dan Development):

| Variable | Contoh nilai untuk Supabase |
| --- | --- |
| `DB_HOST` | `aws-0-ap-southeast-1.pooler.supabase.com` |
| `DB_PORT` | `6543` |
| `DB_USER` | `postgres.<project-ref>` |
| `DB_PASSWORD` | password database Supabase Anda |
| `DB_NAME` | `postgres` |
| `DB_SSL` | kosongkan (SSL otomatis aktif untuk host non-lokal) |
| `AUTH_SECRET` | string acak ≥32 karakter — kunci signing cookie session (**wajib**). Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_EMAILS` | opsional — email (pisah koma) yang otomatis mendapat role **admin** saat registrasi |
| `DEMO_USER_ID` | tidak diperlukan lagi (kompatibilitas lama) |

Jika password mengandung karakter khusus (`@`, `#`, `%`, dll.) tidak perlu di-encode karena dikirim sebagai env var terpisah, bukan bagian dari URL.

- Redeploy agar env var terbaca.

**4. Verifikasi**

- Buka `https://<app>.vercel.app/api/health` → respons `{ "status": "ok", "database": "up" }` berarti aplikasi dan database terhubung.

### Autentikasi & Isolasi Data per User

- Registrasi: password di-hash dengan **scrypt** (Node crypto, tanpa dependensi) tersimpan di `users.password_hash`; user baru otomatis mendapat dompet **Dompet Tunai** dan memakai kategori sistem.
- Session: cookie httpOnly `fa_session` berisi payload + signature **HMAC-SHA256** dengan kunci `AUTH_SECRET` — tanpa tabel session (stateless). Verifikasi dilakukan di `src/hooks.server.ts`, hasilnya di `event.locals.userId`.
- Seluruh endpoint `/api/*` (kecuali auth & health) mewajibkan login (`requireUserId` → 401) dan memfilter query per `user_id`, sehingga transaksi dompet & budget **terpisah penuh antar user**.
- Halaman `/login` dan `/register`; halaman privat diarahkan ke `/login` bila belum login; tombol **Keluar** di navigasi.

### Panel Admin

Akses `/admin` terbatas untuk user ber-role `admin`. Role admin diberikan bila:

- akun adalah **user pertama** yang mendaftar pada database kosong, **atau**
- email akun tercantum di env `ADMIN_EMAILS` (dipisah koma, mis. `admin@contoh.com,owner@contoh.com`).

Kemampuan panel admin:

- **Manajemen akun** — daftar semua akun (cari nama/email, statistik transaksi/dompet/budget), **blokir** akun dengan alasan (user terblokir tidak bisa login maupun memakai API — 403), buka blokir, jadikan/cabut role admin. Admin tidak bisa memblokir atau menurunkan dirinya sendiri (anti-lockout).
- **Manajemen kategori** — lihat semua kategori (sistem + milik user) beserta jumlah pemakaian, tambah/edit **kategori sistem** (nama, tipe, warna, kategori induk), hapus kategori sistem (ditolak 409 bila masih dipakai transaksi, sub-kategori, budget, atau item transaksi).
- **Manajemen tipe dompet** — tipe dompet kini dinamis di tabel `wallet_types` (awal: Tunai/Bank/E-Wallet/Kartu Kredit). Admin dapat menambah, mengubah label, mengaktifkan/menonaktifkan, serta menghapus tipe (ditolak 409 bila masih dipakai dompet). Kolom `wallets.type` kini FK ke `wallet_types(code)`.

- **`transactions.ts`** — penyimpanan atomik (`db.begin`): `SELECT ... FOR UPDATE` pada dompet, insert transaksi, update saldo per tipe (INCOME/EXPENSE/TRANSFER), lalu **warning engine** budget.
- **Warning engine** — untuk EXPENSE, budget terkait (kategori transaksi + seluruh leluhur melalui recursive CTE, plus budget global) dievaluasi terhadap periode berjalan (`period.ts`: harian/minggu ISO/bulanan/tahunan). Jika pemakaian ≥ threshold atau > limit, `INSERT INTO budget_alerts ... ON CONFLICT (budget_id, period_key, alert_level) DO NOTHING` — anti-spam per periode.
- **`dashboard.ts`** — agregasi CASE WHEN untuk income/expense/net cashflow, breakdown kategori, total saldo (`is_included_in_total`).

## Struktur Direktori

```text
src/
├── core/                       # Singleton services & global types
│   ├── api/                    # HTTP client wrapper
│   ├── auth/                   # Session service & guard
│   └── ocr/                    # Service integrasi AI Vision / OCR (provider interface + mock)
├── server/                     # Kode khusus server (db, auth, warning engine, agregasi)
├── shared/                     # Komponen UI reusable & formatters
│   ├── components/             # Button, Card, Input, Select, Modal
│   ├── models/                 # Tipe domain (Transaction, Wallet, Category, dll.)
│   └── pipes/                  # CurrencyFormatter, DateFormatter
├── features/                   # Modul utama berbasis fitur
│   ├── dashboard/              # Ringkasan metrik & grafik kategori
│   ├── transactions/           # Pencatatan & riwayat transaksi
│   ├── receipt-scanner/        # Unggah & ekstraksi gambar resi
│   └── budgets/                # Status & form atur budget
└── routes/                     # Routing (/, /transactions, /scan, /api/*)
```

### Prinsip

- **Smart vs. Dumb Components:** halaman (`routes/`) memanggil service & mengelola store; komponen di `features/*/components/` hanya menerima props dan callback.
- **Service Layer:** seluruh logika bisnis ada di `*.service.ts`; komponen Svelte fokus pada tampilan.
- **OCR Pluggable:** `core/ocr` mendefinisikan `OcrProvider`; implementasi mock siap diganti provider Vision/OCR nyata (pemanggilan API key wajib di backend).

## Progressive Web App (PWA)

Aplikasi dapat di-*install* ke home screen (Android/iOS/desktop):

- `static/manifest.webmanifest` — metadata installable (standalone, tema indigo, ikon 192/512 + maskable).
- `static/sw.js` — service worker tanpa dependensi: *cache-first* untuk aset immutable, *network-first* untuk navigasi dengan fallback offline ke cache.
- Registrasi service worker di `src/routes/+layout.svelte` (hanya aktif pada build produksi).

## Responsivitas

- Layout fluid (`max-w-4xl`) dengan grid yang menyesuaikan: 1 kolom di HP, 3 kolom kartu metrik mulai `sm`, 2 kolom konten mulai `lg`.
- Header dan kontrol memakai `flex-wrap` agar tidak overflow di layar sempit.
- Modal review resi menumpuk (gambar di atas, formulir di bawah) di layar kecil.
- `viewport-fit=cover` + `env(safe-area-inset-*)` untuk perangkat berponi/notch saat mode standalone.

## Fitur

- **Dashboard:** Total saldo, pemasukan & pengeluaran bulan berjalan, grafik pengeluaran per kategori.
- **Transaksi:** tambah/hapus transaksi (pemasukan/pengeluaran), filter bulan, pencarian kata kunci.
- **Scan Resi:** drag-and-drop gambar (jpg/png/webp, maks 5MB), kompresi sisi klien, ekstraksi terstruktur (merchant, tanggal, item, pajak/diskon, total), modal review dengan opsi simpan sebagai satu transaksi atau dipecah per item.

> Ekstraksi struk saat ini masih *mock* di sisi server (`src/lib/server/receipts.ts`) — struktur sudah siap diganti provider Vision/OCR nyata tanpa mengubah frontend.

## Develop

```sh
npm install
npm run dev -- --open
```

## Checks

```sh
npm run check    # svelte-check + TypeScript
npm run build    # production build
```
