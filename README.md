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

### Migrasi Skema

File `server/migrations/` berisi migrasi Inkremental untuk database yang sudah berjalan (Supabase/Vercel). Terapkan manual via SQL editor Supabase atau `psql`:

- `002_transaction_items_discount.sql` — kolom `discount DECIMAL(15,2) NOT NULL DEFAULT 0` pada tabel `transaction_items` (untuk diskon per barang hasil scan resi).
- `002_user_wallet_types.sql` — migrasi **tipe dompet per user**: `UNIQUE (user_id, code)` pada `wallet_types`, `wallets.type` menjadi FK ke `wallet_types(id)`, `categories.user_id` boleh diset (kategori milik user) dengan indeks aktif, dan semua user demo/existing diangkat ke role `admin`.
- `003_transactions_category_check.sql` — perbaikan constraint `transactions`: kategori wajib kosong hanya untuk TRANSFER; INCOME/EXPENSE kini boleh tanpa kategori (constraint lama keliru mewajibkannya).

Untuk database baru cukup jalankan `server/schema.sql` yang sudah termasuk semua perbaikan ini.

### API Endpoint

| Endpoint | Metode | Fungsi |
| --- | --- | --- |
| `/api/wallets` | GET | Daftar dompet + saldo terkini |
| `/api/categories` | GET | Kategori sistem + milik user |
| `/api/transactions` | GET/POST | Riwayat per bulan (`?month=YYYY-MM&query=`) & simpan transaksi (termasuk rincian barang ke `transaction_items`) |
| `/api/transactions/[id]` | GET/PUT/DELETE | Detail + rincian barang; **ubah di tempat (UPDATE)** — id & created_at tetap, saldo dompet direkonsiliasi (items lama dipertahankan bila tidak dikirim); hapus dengan pembalikan saldo |
| `/api/dashboard/summary` | GET | Cashflow, breakdown kategori, total saldo, status budget |
| `/api/budgets` | GET/POST | Status budget real-time & buat aturan budget |
| `/api/receipts/parse` | POST | Ekstraksi struk via AI Groq (multipart field `receipt`) — fallback mock bila `GROQ_API_KEY` kosong |
| `/api/health` | GET | Cek konektivitas aplikasi + database (untuk verifikasi deployment) |
| `/api/auth/register` | POST | Daftar akun baru (nama, email, password) — otomatis login + dompet awal |
| `/api/auth/login` | POST | Masuk (email + password) → session cookie httpOnly 7 hari |
| `/api/auth/logout` | POST | Keluar (hapus cookie session) |
| `/api/auth/me` | GET | Profil user yang sedang login |
| `/api/admin/users` | GET/POST | (Admin) Daftar semua akun + statistik data (cari via `?query=`); tambah akun baru (password di-hash, dompet awal "Dompet Utama" tipe Bank otomatis) |
| `/api/admin/users/[id]` | PATCH/DELETE | (Admin) Blokir/buka blokir (dengan alasan), ubah role, edit nama/email; hapus akun (data terkait terhapus via CASCADE, akun sendiri tidak bisa dihapus) |
| `/api/admin/categories` | GET/POST | (Admin) Semua kategori + pemakaian; buat kategori sistem |
| `/api/admin/categories/[id]` | PATCH/DELETE | (Admin) Edit nama/warna & hapus kategori sistem (dijaga dari pemakaian) |
| `/api/admin/wallet-types` | GET/POST | (Admin) Semua tipe dompet + jumlah pemakaian; buat tipe baru |
| `/api/admin/wallet-types/[code]` | PATCH/DELETE | (Admin) Edit label/aktif & hapus tipe dompet |
| `/api/admin/wallets` | GET/POST | (Admin) Semua dompet milik pengguna (pemilik, tipe, saldo, pemakaian); buat dompet untuk pengguna |
| `/api/admin/wallets/[id]` | PATCH/DELETE | (Admin) Edit nama/tipe/mata uang/ikut-total & hapus dompet (dijaga dari pemakaian transaksi) |
| `/api/my/categories` | GET/POST | Kategori **milik user login** (beserta jumlah pakai); tambah kategori pribadi (opsional kategori induk miliknya) |
| `/api/my/categories/[id]` | PATCH/DELETE | Edit nama/tipe & hapus kategori milik user (ditolak 409 bila dipakai transaksi/sub-kategori) |
| `/api/my/wallet-types` | GET/POST | Tipe dompet milik user + global (kode unik per user); tambah tipe pribadi (kode berasal dari label bila kosong) |
| `/api/my/wallet-types/[id]` | PATCH/DELETE | Edit kode/label/aktif & hapus tipe milik user (ditolak 409 bila dipakai dompet) |
| `/api/wallets` | POST | Tambah dompet milik user (saldo awal >= 0, tipe di-resolve milik user → global) |
| `/api/wallets/[id]` | PATCH/DELETE | Edit nama/tipe/ikut-total & hapus dompet milik user (ditolak 409 bila dipakai transaksi) |

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

- Registrasi: password di-hash dengan **scrypt** (Node crypto, tanpa dependensi) tersimpan di `users.password_hash`; user baru otomatis mendapat dompet **Dompet Utama** (tipe Bank) dan memakai kategori sistem.
- Session: cookie httpOnly `fa_session` berisi payload + signature **HMAC-SHA256** dengan kunci `AUTH_SECRET` — tanpa tabel session (stateless). Verifikasi dilakukan di `src/hooks.server.ts`, hasilnya di `event.locals.userId`.
- Seluruh endpoint `/api/*` (kecuali auth & health) mewajibkan login (`requireUserId` → 401) dan memfilter query per `user_id`, sehingga transaksi dompet & budget **terpisah penuh antar user**.
- Halaman `/login` dan `/register`; halaman privat diarahkan ke `/login` bila belum login; tombol **Keluar** di navigasi.

### Pengaturan Saya (per User)

Selain kategori/tipe dompet/dompet global yang dikelola admin, tiap user kini punya halaman **`/pengaturan`** (menu sidebar **Pengaturan** berupa tree: Kategori Saya / Tipe Dompet Saya / Dompet Saya) untuk mengelola datanya sendiri:

- **Kategori Saya** — kategori pribadi (INCOME/EXPENSE, opsional kategori induk miliknya). Transaksi dapat memakai kategori sistem maupun milik sendiri; resolver tipe dompet memilih milik user **lebih dulu** daripada global.
- **Tipe Dompet Saya** — tipe dompet pribadi dengan kode unik pada scope user (kode berasal dari label; suffix `_2`, `_3`, … bila bentrok dengan tipe global/milik sendiri). Baris global milik admin tampil dengan badge **Sistem (read-only)**. Tipe dapat dinonaktifkan/dihapus (ditolak 409 bila masih dipakai dompet).
- **Dompet Saya** — CRUD dompet milik sendiri: nama, tipe (milik + global aktif), saldo awal (tambah), dan penanda ikut-dihitung-total. Penghapusan ditolak 409 bila masih dipakai transaksi.

Semua aturan UI baku diikuti: pencarian via tombol Cari (header tabel tetap), skeleton saat memuat, aksi tabel berikon (kebab menu bila > 3), konfirmasi sebelum hapus, loading pada tombol proses, dan modal tetap terbuka agar input tidak hilang bila gagal.

### Panel Admin

Akses `/admin` terbatas untuk user ber-role `admin`. Di sidebar, menu **Admin** kini berupa **tree** yang dapat dibuka/tutup dengan empat sub-menu: **Akun** (`/admin?tab=users`), **Kategori** (`/admin?tab=categories`), **Tipe Dompet** (`/admin?tab=walletTypes`), dan **Dompet** (`/admin?tab=wallets`) — tab aktif tercermin pada query param URL. Role admin diberikan bila:

- akun adalah **user pertama** yang mendaftar pada database kosong, **atau**
- email akun tercantum di env `ADMIN_EMAILS` (dipisah koma, mis. `admin@contoh.com,owner@contoh.com`).

Kemampuan panel admin:

- **Manajemen akun** — daftar semua akun (cari nama/email via tombol Cari, statistik transaksi/dompet/budget), **tambah akun** (nama, email, password di-hash, role — dompet awal "Dompet Utama" (Bank) dibuat otomatis), **edit akun** (nama/email; password diubah lewat "Ganti Password"), **hapus akun** dengan konfirmasi (seluruh data terkait ikut terhapus via CASCADE; akun sendiri tidak bisa dihapus), **blokir** akun dengan alasan (user terblokir tidak bisa login maupun memakai API — 403), buka blokir, jadikan/cabut role admin. Admin tidak bisa memblokir atau menurunkan dirinya sendiri (anti-lockout).
- **Manajemen kategori** — lihat semua kategori (sistem + milik user) beserta jumlah pemakaian, tambah/edit **kategori sistem** (nama, tipe, warna, kategori induk), hapus kategori sistem (ditolak 409 bila masih dipakai transaksi, sub-kategori, budget, atau item transaksi).
- **Manajemen tipe dompet** — tipe dompet kini dinamis di tabel `wallet_types` (awal: Tunai/Bank/E-Wallet/Kartu Kredit). Admin dapat menambah, mengubah label, mengaktifkan/menonaktifkan, serta menghapus tipe (ditolak 409 bila masih dipakai dompet). Tipe dompet milik pengguna juga dikelola lewat menu **Pengaturan** di halaman `/pengaturan`; resolver memilih milik user lebih dulu daripada global. Kolom `wallets.type` kini FK ke `wallet_types(id)`. **Pemilih dompet** pada form transaksi otomatis mengelompokkan dompet per tipe (optgroup) memakai label terkini dari tabel `wallet_types` di admin.
- **Manajemen dompet (tab Dompet)** — admin dapat melihat **seluruh tabel `wallets`** milik semua pengguna (pemilik, tipe, saldo, mata uang, jumlah transaksi), **membuat** dompet untuk pengguna mana pun (dengan saldo awal), **mengubah** nama/tipe/mata uang/penanda ikut-dihitung-total, dan **menghapus** dompet (ditolak 409 bila masih dipakai transaksi). Saldo berjalan tetap dikelola lewat transaksi agar selalu konsisten dengan riwayat.

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
└── routes/                     # Routing (/, /transactions, /transactions/new, /admin, /api/*)  — Tambah Transaksi diakses dari tombol halaman transaksi
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
- **Transaksi:** tambah/hapus transaksi (pemasukan/pengeluaran), filter bulan, pencarian kata kunci. Transaksi dapat **dilihat detail** (modal, termasuk tabel rincian barang) dan **diedit** lewat modal edit (UPDATE di tempat — id tetap; semua tipe termasuk TRANSFER bisa diedit). Penghapusan transaksi selalu lewat **dialog konfirmasi** yang menampilkan catatan transaksi.
- **Pindah saldo antar dompet:** pilih tipe **Transfer** pada form transaksi (halaman Tambah Transaksi maupun modal edit) — pilih dompet sumber + dompet tujuan, saldo dompet sumber berkurang dan dompet tujuan bertambah secara atomik.
- **Standar pencarian:** di semua halaman, filter pencarian hanya diterapkan setelah tombol **Cari** ditekan (bukan live saat mengetik). Saat memuat/mencari, **tabel tidak dihilangkan** — hanya body (`tbody`) yang diganti skeleton, header tabel tetap tampil.
- **Tambah Transaksi:** halaman khusus `/transactions/new` dengan form transaksi penuh, diakses lewat tombol "+ Tambah Transaksi" pada halaman transaksi.
- **Scan Resi:** berupa **modal di halaman transaksi** (tombol "Scan Resi" di samping "Tambah Transaksi" — tidak lagi route terpisah). drag-and-drop gambar (jpg/png/webp, maks 5MB), kompresi sisi klien, ekstraksi terstruktur via **AI Groq** (merchant, tanggal, item + harga/diskon, pajak/diskon, total). Hasil scan disimpan sebagai **satu transaksi lengkap dengan rincian barangnya** ke tabel `transaction_items` (nama, quantity, harga satuan, diskon) — ditampilkan pada modal detail transaksi.

- **Validasi saldo transfer:** saldo dompet **tidak boleh minus** akibat TRANSFER — server menolak (400 "Saldo dompet sumber tidak cukup untuk transfer ini.") saat membuat transfer yang melebihi saldo, maupun saat mengedit transfer (mis. menaikkan nominal atau membalik arah) yang membuat saldo proyeksi dompet sumber negatif.

> Ekstraksi memakai model vision Groq (`https://api.groq.com/openai/v1/chat/completions`) secara server-side. Atur env `GROQ_API_KEY` dan opsional `GROQ_MODEL` (default `qwen/qwen3.8-27b` — model vision Groq yang didukung; model lama llama-4-scout sudah dihentikan Groq). Bila key kosong, server memakai data *mock* agar alur tetap bisa dicoba.

- **Tombol proses dengan loading:** semua tombol yang memicu proses (simpan transaksi, simpan budget, cari, blokir, simpan password, dll.) menampilkan spinner dan tidak bisa diklik dua kali selama proses berjalan. Input form **tidak dikosongkan** sebelum proses berhasil (form tambah transaksi dikosongkan hanya setelah sukses).

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
