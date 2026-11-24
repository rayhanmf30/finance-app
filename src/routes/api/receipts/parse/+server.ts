import { error, json } from '@sveltejs/kit';
import { parseReceipt } from '#lib/server/receipts';
import { requireUserId } from '#lib/server/session';
import type { RequestHandler } from './$types';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 5;

export const POST: RequestHandler = async ({ request, locals }) => {
	const userId = requireUserId(locals);
	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		throw error(400, 'Request harus berupa multipart/form-data.');
	}
	const file = form.get('receipt');

	if (!(file instanceof File)) {
		throw error(400, 'File resi wajib diunggah pada field "receipt".');
	}
	if (!ACCEPTED_TYPES.includes(file.type)) {
		throw error(400, 'Format harus .jpg, .png, atau .webp.');
	}
	if (file.size > MAX_SIZE_MB * 1024 * 1024) {
		throw error(400, 'Ukuran maksimal 5MB.');
	}

	const buffer = Buffer.from(await file.arrayBuffer());
	const dataUrl = `data:${file.type};base64,${buffer.toString('base64')}`;

	let extraction;
	try {
		extraction = await parseReceipt(userId, dataUrl);
	} catch (err) {
		// Teruskan detail error Groq (mis. 400 model decommissioned, 401 invalid key)
		// agar pengguna/developer tahu akar masalahnya, bukan sekadar "Internal Error".
		console.error('[api/receipts/parse]', err instanceof Error ? err.message : err);
		throw error(502, err instanceof Error ? err.message : 'Gagal mengekstrak resi.');
	}
	return json(extraction);
};
