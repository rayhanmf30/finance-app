-- 002: kolom diskon untuk barang pada transaction_items (terpakai oleh scan resi AI / Groq).
-- Jalankan hanya pada database yang sudah memakai migrasi 001 (atau database lama tanpa kolom ini).

ALTER TABLE transaction_items
    ADD COLUMN IF NOT EXISTS discount DECIMAL(15,2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0);
