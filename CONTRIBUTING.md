# Panduan Kontribusi FinanceApp

## Alur Kerja (Workflow)

1. **Commit** — semua perubahan di-commit di branch `vibe` mengikuti format Conventional Commits di bawah.
2. **Push** — setelah commit, push ke `origin/vibe`.
3. **Pull Request** — setelah push, **wajib** memastikan ada pull request untuk branch `vibe`:
   - bila belum ada → buat PR baru;
   - bila sudah ada → siapkan update (commit baru otomatis masuk PR).
4. **Komentar/deskripsi PR yang jelas** — deskripsi PR (atau komentar baru pada PR) wajib menjelaskan:
   - daftar **fitur/perbaikan** yang dibuat (per commit, dengan type commit-nya);
   - **cara verifikasi** yang sudah dilakukan (check, build, e2e);
   - catatan khusus bila ada (migrasi DB, env baru, perubahan breaking).

## Aturan Branch

- Semua perubahan dikerjakan di **satu branch bernama `vibe`** (bukan branch baru per fitur).
- Setelah PR merge, branch yang sudah selesai bersihkan agar tidak menumpuk.

## Aturan Commit — Conventional Commits

Semua commit wajib memakai format berikut agar riwayat mudah dibaca dan bisa dipindai otomatis:

```
<type>(<scope>): <deskripsi singkat, huruf kecil, tanpa titik akhir>
```

- **`type`** — lihat daftar di bawah; **wajib**, 1 commit = 1 perubahan logis.
- **`scope`** *(opsional)* — modul/area yang berubah, mis. `auth`, `admin`, `db`, `dashboard`, `pwa`, `ui`, `api`.
- **`deskripsi`** — kalimat perintah bahasa Indonesia (atau Inggris, konsisten), ringkas maksimal ±50 karakter pada baris judul.
- Detail tambahan (alasan, dampak, catatan migrasi) ditulis pada badan commit terpisah setelah baris kosong.

### Daftar tipe commit

| Type | Kegunaan | Contoh |
| --- | --- | --- |
| `feat` | **Fitur baru** | `feat(admin): tambah manajemen tipe dompet` |
| `fix` | **Perbaikan bug** | `fix(db): ekstrak error koneksi supabase dengan lebih jelas` |
| `refactor` | Restrukturisasi kode tanpa mengubah perilaku | `refactor(api): pecah logika transaksi ke modul sendiri` |
| `perf` | Perbaikan performa | `perf(dashboard): agregasi cashflow di SQL bukan JS` |
| `docs` | Dokumentasi (README, komentar) | `docs(readme): tambah panduan migrasi supabase` |
| `test` | Menambah/memperbaiki test | `test(auth): cek isolasi data antar user` |
| `style` | Format/spasi/indentasi, tidak ubah logika | `style(ui): rapikan class tailwind komponen modal` |
| `build` | Dependensi, bundler, build tool | `build: tambah adapter-vercel untuk deployment` |
| `ci` | Pipeline CI/CD | `ci: jalankan svelte-check di vercel build` |
| `chore` | Pemeliharaan lain (ci, konfig minor) | `chore: perbarui lockfile dependensi` |
| `revert` | Membatalkan commit sebelumnya | `revert: feat(admin): manajemen tipe dompet` |

### Contoh penerapan pada 1 PR

```
feat(admin): panel admin untuk kelola kategori sistem
feat(admin): endpoint manajemen tipe dompet
fix(db): guard hapus kategori yang masih dipakai
docs(readme): dokumentasi panel admin dan migrasi 001
```

### Kapan memecah commit?

- **Wajib dipisah**: fitur vs perbaikan bug vs refactor vs docs — jangan dicampur.
- Perubahan skema DB (`server/schema.sql` / `server/migrations/*`) selalu commit sendiri dengan scope `db`.
- File yang berhubungan satu unit logis boleh satu commit (mis. service + endpoint + UI satu fitur).
- Commit kecil & fokus memudahkan `git revert`, review, dan mencari asal-usul perubahan.
