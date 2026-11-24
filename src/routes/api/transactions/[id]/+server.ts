import { json } from '@sveltejs/kit';
import {
	createTransaction,
	deleteTransaction,
	getTransaction,
	listTransactionItems
} from '#lib/server/transactions';
import { requireUserId } from '#lib/server/session';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const userId = requireUserId(locals);
	return json(await getTransaction(userId, params.id));
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const userId = requireUserId(locals);
	await deleteTransaction(userId, params.id);
	return new Response(null, { status: 204 });
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const userId = requireUserId(locals);
	const body = await request.json();
	// Pertahankan rincian barang lama bila request edit tidak mengirim items
	// (implementasi saat ini hapus+bikin ulang transaksi secara atomik).
	if (!('items' in body)) {
		const items = await listTransactionItems(userId, params.id);
		if (items.length > 0) body.items = items;
	}
	await deleteTransaction(userId, params.id);
	const transaction = await createTransaction(userId, body);
	return json(transaction);
};
