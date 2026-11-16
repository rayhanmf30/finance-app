# FinanceApp — Aplikasi Manajemen Keuangan Pribadi

Aplikasi web pencatatan arus kas harian (pemasukan & pengeluaran) dengan fitur pemindaian struk belanja via OCR/AI Vision. Dibangun dengan SvelteKit + Svelte 5 (runes), TypeScript, dan Tailwind CSS v4, mengikuti arsitektur *feature-based modular* ala Angular.

## Tech Stack

- **Framework:** SvelteKit 3 + Svelte 5 (runes mode)
- **Bahasa:** TypeScript
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/vite`)
- **State:** Svelte runes ($state/$derived) yang dienkapsulasi per modul fitur

## Struktur Direktori

```text
src/
├── core/                       # Singleton services & global types
│   ├── api/                    # HTTP client wrapper + mock in-memory DB
│   ├── auth/                   # Session service & guard
│   └── ocr/                    # Service integrasi AI Vision / OCR (provider interface + mock)
├── shared/                     # Komponen UI reusable & formatters
│   ├── components/             # Button, Card, Input, Select, Modal
│   ├── models/                 # Tipe domain (Transaction, Wallet, Category, dll.)
│   └── pipes/                  # CurrencyFormatter, DateFormatter
├── features/                   # Modul utama berbasis fitur
│   ├── dashboard/              # Ringkasan metrik & grafik kategori
│   ├── transactions/           # Pencatatan & riwayat transaksi
│   └── receipt-scanner/        # Unggah & ekstraksi gambar resi
└── routes/                     # Routing (/ , /transactions, /scan)
```

### Prinsip

- **Smart vs. Dumb Components:** halaman (`routes/`) memanggil service & mengelola store; komponen di `features/*/components/` hanya menerima props dan callback.
- **Service Layer:** seluruh logika bisnis ada di `*.service.ts`; komponen Svelte fokus pada tampilan.
- **OCR Pluggable:** `core/ocr` mendefinisikan `OcrProvider`; implementasi mock siap diganti provider Vision/OCR nyata (pemanggilan API key wajib di backend).

## Fitur

- **Dashboard:** Total saldo, pemasukan & pengeluaran bulan berjalan, grafik pengeluaran per kategori.
- **Transaksi:** tambah/hapus transaksi (pemasukan/pengeluaran), filter bulan, pencarian kata kunci.
- **Scan Resi:** drag-and-drop gambar (jpg/png/webp, maks 5MB), kompresi sisi klien, ekstraksi terstruktur (merchant, tanggal, item, pajak/diskon, total), modal review dengan opsi simpan sebagai satu transaksi atau dipecah per item.

> Saat ini seluruh service memakai **mock in-memory database** (`src/lib/core/api/mock-db.ts`) — tidak ada data yang persisten. Integrasi backend PostgreSQL sesuai skema ERD menyusul.

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
