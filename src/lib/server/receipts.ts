import { db } from './db';
import type { ReceiptExtraction } from '#lib/shared/models/domain';
import { GROQ_API_KEY, GROQ_MODEL } from '$app/env/private';

/**
 * Default model vision Groq yang mendukung input gambar + JSON mode.
 * Model lama (meta-llama/llama-4-scout-17b-16e-instruct) sudah dihentikan (decommissioned)
 * oleh Groq sehingga ekstraksi selalu gagal 400 model_not_found/decommissioned.
 * https://console.groq.com/docs/vision
 */
const DEFAULT_MODEL = 'qwen/qwen3.8-27b';

const PROMPT = `Anda adalah asisten keuangan yang ahli membaca foto struk belanja (receipt).
Ekstrak SEMUA data pada struk ini dan balas HANYA dengan satu objek JSON valid tanpa teks lain:

{
  "merchantName": "Nama merchant/toko beserta cabang jika ada",
  "transactionDate": "tanggal struk dalam format ISO 8601 (YYYY-MM-DDTHH:mm:ssZ), gunakan jam 12:00 jika jam tidak tercantum",
  "items": [
    {
      "name": "nama lengkap barang pada struk",
      "quantity": 1,
      "unitPrice": 10000,
      "discount": 0,
      "subtotal": 10000
    }
  ],
  "tax": 0,
  "discount": 0,
  "total": 0
}

Aturan:
- Angka gunakan titik desimal, tanpa pemisah ribuan (mis. 43400.00).
- "discount" per item adalah potongan harga khusus baris tersebut (potongan member/diskon produk), 0 jika tidak ada.
- "tax" adalah pajak/biaya layanan; "discount" (level transaksi) adalah potongan akhir/global; 0 jika tidak ada.
- "total" adalah nilai akhir yang dibayar. Jika total !== jumlah subtotal + tax - discount(akun diskon level transaksi), koreksi item agar konsisten.
- Jika sebuah data tidak ada pada struk, isi 0 atau string kosong sesuai tipe.
- Fokus akurasi harga, kuantitas, diskon, dan total.`;

interface GroqVisionResponse {
	choices?: { message?: { content?: string } }[];
}

/** Fallback mock bila GROQ_API_KEY belum diset (dev/demo). */
function mockExtraction(suggestedCategoryId: string | null): ReceiptExtraction {
	return {
		merchantName: 'Indomaret Kemang',
		transactionDate: new Date().toISOString(),
		items: [
			{ name: 'Indomie Goreng', quantity: 5, unitPrice: 3500, discount: 0, subtotal: 17500 },
			{ name: 'Teh Kotak 250ml', quantity: 2, unitPrice: 5000, discount: 0, subtotal: 10000 },
			{ name: 'Roti Tawar', quantity: 1, unitPrice: 18500, discount: 0, subtotal: 18500 }
		],
		tax: 1900,
		discount: 4500,
		total: 43400,
		suggestedCategoryId
	};
}

async function extractWithGroq(imageDataUrl: string): Promise<Omit<ReceiptExtraction, 'suggestedCategoryId'>> {
	const apiKey = GROQ_API_KEY;
	if (!apiKey) {
		throw new Error('GROQ_API_KEY belum diset.');
	}

	const send = async (model: string) =>
		await fetch('https://api.groq.com/openai/v1/chat/completions', {
			method: 'POST',
			headers: {
				authorization: `Bearer ${apiKey}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				model,
				temperature: 0,
				max_completion_tokens: 2048,
				response_format: { type: 'json_object' },
				messages: [
					{
						role: 'user',
						content: [
							{ type: 'text', text: PROMPT },
							{ type: 'image_url', image_url: { url: imageDataUrl } }
						]
					}
				]
			})
		});

	// Fallback: bila GROQ_MODEL env masih memuat model lama yang sudah
	// dihentikan Groq (mis. llama-4-scout), coba sekali lagi dengan model default.
	const configured = GROQ_MODEL || DEFAULT_MODEL;
	let res = await send(configured);
	if (!res.ok) {
		const detail = await res.text().catch(() => '');
		const modelRelated = /decommissioned|model_not_found|does not exist|invalid model|not supported/i.test(detail);
		if (res.status === 400 && modelRelated && configured !== DEFAULT_MODEL) {
			console.error(`[receipts] Model "${configured}" ditolak Groq, mencoba fallback "${DEFAULT_MODEL}".`);
			res = await send(DEFAULT_MODEL);
		} else {
			throw new Error(`Groq API ${res.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`);
		}
	}

	if (!res.ok) {
		const detail = await res.text().catch(() => '');
		throw new Error(`Groq API ${res.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`);
	}

	const payload = (await res.json()) as GroqVisionResponse;
	const content = payload.choices?.[0]?.message?.content ?? '';
	let parsed: Record<string, unknown>;
	try {
		parsed = JSON.parse(content);
	} catch {
		throw new Error('Balasan AI bukan JSON yang valid.');
	}

	const num = (v: unknown): number => {
		const n = Number(v);
		return Number.isFinite(n) ? n : 0;
	};
	const rawItems = Array.isArray(parsed.items) ? parsed.items : [];

	return {
		merchantName: typeof parsed.merchantName === 'string' && parsed.merchantName.trim() ? parsed.merchantName.trim() : 'Tanpa merchant',
		transactionDate: typeof parsed.transactionDate === 'string' && !Number.isNaN(Date.parse(parsed.transactionDate))
			? new Date(parsed.transactionDate).toISOString()
			: new Date().toISOString(),
		items: rawItems.map((raw) => {
			const item = (raw ?? {}) as Record<string, unknown>;
			const quantity = num(item.quantity) || 1;
			const unitPrice = num(item.unitPrice);
			const discount = num(item.discount);
			const computed = quantity * unitPrice - discount;
			return {
				name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : 'Item tanpa nama',
				quantity,
				unitPrice,
				discount,
				subtotal: num(item.subtotal) || computed
			};
		}),
		tax: num(parsed.tax),
		discount: num(parsed.discount),
		total: num(parsed.total)
	};
}

/**
 * Ekstraksi struk memakai AI Groq (vision) — fokus pada data struk:
 * merchant, tanggal, rincian barang (nama, kuantitas, harga, diskon), pajak, dan total.
 * Bila GROQ_API_KEY tidak diset, memakai data mock agar pengembangan tetap jalan.
 */
export async function parseReceipt(userId: string, imageDataUrl?: string): Promise<ReceiptExtraction> {
	const categories = await db`
		SELECT id, name FROM categories
		WHERE (user_id IS NULL OR user_id = ${userId}) AND type = 'EXPENSE'
		ORDER BY name
	`;
	const suggested = categories.find((c) => c.name === 'Belanja') ?? categories[0];

	if (!imageDataUrl || !GROQ_API_KEY) {
		return mockExtraction(suggested?.id ?? null);
	}

	try {
		const extraction = await extractWithGroq(imageDataUrl);
		return { ...extraction, suggestedCategoryId: suggested?.id ?? null };
	} catch (err) {
		console.error('[receipts] Ekstraksi Groq gagal:', err instanceof Error ? err.message : err);
		throw err;
	}
}
