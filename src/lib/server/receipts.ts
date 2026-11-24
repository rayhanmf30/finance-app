import { db } from './db';
import type { ReceiptExtraction } from '#lib/shared/models/domain';
import { GROQ_API_KEY, GROQ_MODEL } from '$app/env/private';

/**
 * Konfigurasi ekstraksi struk via Groq (mengikuti pola KEUANGAN BOT v2.0):
 * - model via env `GROQ_MODEL`, fallback ke rantai model vision aktif;
 * - retry ber-backoff saat API gagal sesaat (429/5xx/network);
 * - parsing JSON toleran (buang ```json fence, ambil blok {...} pertama);
 * - validasi hasil sebelum dipakai.
 *
 * Catatan model:
 * - `qwen/qwen3.8-27b` — model vision aktif di Groq (mendukung image_url + JSON mode);
 * - `meta-llama/llama-4-scout-17b-16e-instruct` sudah DIHENTIKAN Groq — jangan dipakai;
 * - `llama-3.3-70b-versatile` (yang dipakai bot teks WhatsApp) TIDAK mendukung gambar,
 *   sehingga tidak masuk rantai model scan.
 * https://console.groq.com/docs/vision
 */
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'qwen/qwen3.8-27b';
const FALLBACK_MODELS = ['meta-llama/llama-4-maverick-17b-128e-instruct'];
const MAX_RETRIES = 2;

const SYSTEM_PROMPT =
	'You are a precise Indonesian retail receipt extractor. ' +
	'You read receipt photos and output ONLY a single valid JSON object, no markdown, no explanation.';

const PROMPT = `Ekstrak SEMUA data pada foto struk belanja ini dan balas HANYA satu objek JSON valid:

{
  "merchantName": "Nama merchant/toko beserta cabang jika ada",
  "transactionDate": "tanggal struk format ISO 8601 (YYYY-MM-DDTHH:mm:ssZ), gunakan jam 12:00 jika jam tidak tercantum",
  "items": [
    { "name": "nama lengkap barang pada struk", "quantity": 1, "unitPrice": 10000, "discount": 0, "subtotal": 10000 }
  ],
  "tax": 0,
  "discount": 0,
  "total": 0
}

Aturan:
- cat = hanya di dalam JSON di atas; JANGAN menambah teks lain.
- Angka tanpa pemisah ribuan, titik desimal (mis. 43400.00).
- "discount" per item = potongan khusus baris itu (diskon produk/member), 0 jika tidak ada.
- "tax" = pajak/biaya layanan; "discount" (level transaksi) = potongan akhir/global; 0 jika tidak ada.
- "total" = nilai akhir dibayar. Jika total !== subtotal + tax - discount(level transaksi), koreksi item agar konsisten.
- Data yang tidak ada diisi 0 atau string kosong sesuai tipe.
- Fokus akurasi harga, kuantitas, diskon, dan total.`;

interface GroqVisionResponse {
	choices?: { message?: { content?: string | null; reasoning?: string | null }; finish_reason?: string }[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parsing balasan AI yang toleran (pola `extractJson_` di KEUANGAN BOT):
 * - buang blok reasoning <think>...</think> dan pembungkus ```json ...```;
 * - bila masih gagal, ambil blok {...} pertama yang ditemukan.
 */
function parseAiJson(content: string): Record<string, unknown> {
	let text = (content ?? '').trim();
	text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
	text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
	try {
		return JSON.parse(text) as Record<string, unknown>;
	} catch {
		const match = text.match(/\{[\s\S]*\}/);
		if (!match) throw new Error('no JSON object');
		return JSON.parse(match[0]) as Record<string, unknown>;
	}
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

function groqErrorText(detail: string): string {
	try {
		const parsed = JSON.parse(detail) as { error?: { message?: string; code?: string } };
		if (parsed.error?.message) {
			return parsed.error.code ? `${parsed.error.code}: ${parsed.error.message}` : parsed.error.message;
		}
	} catch {
		/* bukan JSON — pakai potongan teks mentah */
	}
	return detail.slice(0, 300);
}

/**
 * Panggil Groq vision dengan retry ber-backoff (pola `panggilGroq_` di KEUANGAN BOT).
 * - model yang ditolak Groq (decommissioned/model_not_found) langsung lanjut model fallback;
 * - error sementara (429/5xx/network) diulang hingga MAX_RETRIES dengan jeda 500ms × percobaan.
 */
async function callGroq(apiKey: string, model: string, imageDataUrl: string): Promise<Response> {
	// qwen3.x adalah model reasoning hibrida — matikan mode berpikir agar token
	// tidak habis untuk reasoning dan keluar JSON langsung (`reasoning_effort: 'none'`).
	const isQwen = model.toLowerCase().includes('qwen');

	const send = () =>
		fetch(GROQ_URL, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${apiKey}`,
				'content-type': 'application/json'
			},
			signal: AbortSignal.timeout(45_000),
			body: JSON.stringify({
				model,
				temperature: 0,
				max_completion_tokens: 2048,
				response_format: { type: 'json_object' },
				...(isQwen ? { reasoning_effort: 'none' } : {}),
				messages: [
					{ role: 'system', content: SYSTEM_PROMPT },
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

	let lastDetail = '';
	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		let res: Response;
		try {
			res = await send();
		} catch (err) {
			lastDetail = err instanceof Error ? err.message : String(err);
			if (attempt < MAX_RETRIES) {
				await sleep(500 * (attempt + 1));
				continue;
			}
			throw new Error(`Tidak dapat menghubungi Groq API: ${lastDetail}`);
		}

		if (res.ok) return res;

		const detail = await res.text().catch(() => '');
		const modelRelated = /decommissioned|model_not_found|does not exist|invalid model|not supported|unsupported/i.test(detail);
		if (res.status === 400 && modelRelated) {
			// Sinyal untuk pindah ke model berikutnya dalam rantai fallback.
			const err = new Error(`Model "${model}" ditolak Groq: ${groqErrorText(detail)}`);
			(err as { code?: string }).code = 'E_MODEL_REJECTED';
			throw err;
		}

		// 429 (rate limit) / 5xx (gangguan) / 401 sementara → coba ulang.
		const retryable = res.status === 429 || res.status >= 500 || res.status === 401;
		lastDetail = `Groq API ${res.status}: ${groqErrorText(detail)}`;
		if (retryable && attempt < MAX_RETRIES) {
			await sleep(500 * (attempt + 1));
			continue;
		}
		throw new Error(lastDetail);
	}
	throw new Error(`Groq API gagal setelah ${MAX_RETRIES + 1} percobaan: ${lastDetail}`);
}

async function extractWithGroq(imageDataUrl: string): Promise<Omit<ReceiptExtraction, 'suggestedCategoryId'>> {
	const apiKey = GROQ_API_KEY;
	if (!apiKey) {
		const err = new Error('GROQ_API_KEY belum diset.');
		(err as { code?: string }).code = 'E_GROQ_NOT_SET';
		throw err;
	}

	// Rantai model: env GROQ_MODEL → default saat ini → fallback vision lain.
	const chain = [GROQ_MODEL || DEFAULT_MODEL, ...(GROQ_MODEL && GROQ_MODEL !== DEFAULT_MODEL ? [DEFAULT_MODEL] : []), ...FALLBACK_MODELS]
		.filter((model, index, all) => all.indexOf(model) === index);

	let lastErr: unknown = null;
	for (const model of chain) {
		let res: Response;
		try {
			res = await callGroq(apiKey, model, imageDataUrl);
		} catch (err) {
			if ((err as { code?: string }).code === 'E_MODEL_REJECTED') {
				console.error(`[receipts] ${err instanceof Error ? err.message : err} — mencoba model berikutnya.`);
				lastErr = err;
				continue;
			}
			throw err;
		}

		const payload = (await res.json().catch(() => null)) as GroqVisionResponse | null;
		const choice = payload?.choices?.[0];
		const content = (choice?.message?.content ?? '').trim();
		if (!content) {
			// finish_reason=length → token habis (biasanya karena reasoning); beri pesan spesifik.
			const reason = choice?.finish_reason ?? 'unknown';
			throw new Error(
				reason === 'length'
					? 'Balasan AI terpotong (token habis) — coba foto struk yang lebih sederhana.'
					: 'Groq tidak mengembalikan isi balasan.'
			);
		}

		let parsed: Record<string, unknown>;
		try {
			parsed = parseAiJson(content);
		} catch {
			const err = new Error('Balasan AI bukan JSON yang valid.');
			(err as { code?: string }).code = 'E_AI_BAD_JSON';
			throw err;
		}

		return normalizeExtraction(parsed);
	}
	throw lastErr instanceof Error ? lastErr : new Error('Ekstraksi struk gagal.');
}

/** Normalisasi + validasi hasil AI (pola `isValidAiResult_` di KEUANGAN BOT). */
function normalizeExtraction(parsed: Record<string, unknown>): Omit<ReceiptExtraction, 'suggestedCategoryId'> {
	const num = (v: unknown): number => {
		const n = Number(v);
		return Number.isFinite(n) ? n : 0;
	};
	const rawItems = Array.isArray(parsed.items) ? parsed.items : [];

	const extraction: Omit<ReceiptExtraction, 'suggestedCategoryId'> = {
		merchantName: typeof parsed.merchantName === 'string' && parsed.merchantName.trim() ? parsed.merchantName.trim() : '',
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

	// Struk tidak terbaca: tidak ada item dan tidak ada total — jangan balas kosong,
	// minta pengguna coba foto lain (ini penyebab "review" yang tidak muncul apa pun).
	if (extraction.items.length === 0 && extraction.total <= 0 && !extraction.merchantName) {
		const err = new Error('Struk tidak terbaca. Coba foto yang lebih jelas/datar.');
		(err as { code?: string }).code = 'E_RECEIPT_UNREADABLE';
		throw err;
	}
	if (!extraction.merchantName) extraction.merchantName = 'Tanpa merchant';

	return extraction;
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
