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
cp .env.example .env           # DATABASE_URL & DEMO_USER_ID
npm run dev
```

- Skema lengkap (CHECK constraints, composite index, trigger `updated_at`) ada di `server/schema.sql`; data demo ada di `server/seed.sql`.
- Variabel env dideklarasikan di `src/env.ts` (Kit 3 explicit env) dan dibaca via `$app/env/private`.
- Selama modul auth belum aktif, seluruh query memakai user demo `DEMO_USER_ID`.

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

### Logika Inti Server (`src/lib/server/`)

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
