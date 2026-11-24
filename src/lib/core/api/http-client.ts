export class HttpError extends Error {
	constructor(
		readonly status: number,
		readonly body: string
	) {
		super(`HTTP ${status}: ${body}`);
		this.name = 'HttpError';
	}
}

interface ErrorBody {
	message: string;
	/** Kode error opsional dari server (mis. E_UNAUTHORIZED) untuk i18n. */
	code?: string;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
	const isFormData = init?.body instanceof FormData;
	const response = await fetch(url, {
		...init,
		headers: {
			...(isFormData ? {} : { 'Content-Type': 'application/json' }),
			...init?.headers
		}
	});

	if (response.status === 204) {
		return undefined as T;
	}

	if (!response.ok) {
		let message = await response.text();
		let code: string | undefined;
		try {
			const parsed = JSON.parse(message) as ErrorBody;
			if (parsed?.message) message = parsed.message;
			code = parsed?.code;
		} catch {
			// keep raw body
		}
		const error = new HttpError(response.status, message);
		// Properti `code` mengikuti error agar UI bisa memakai i18n (<i18n.displayError(err)>).
		Object.defineProperty(error, 'code', { value: code, enumerable: true });
		throw error;
	}

	return (await response.json()) as T;
}

export const httpClient = {
	get: <T>(url: string) => request<T>(url),
	post: <T>(url: string, body: unknown) =>
		request<T>(url, {
			method: 'POST',
			body: body instanceof FormData ? body : JSON.stringify(body)
		}),
	put: <T>(url: string, body: unknown) =>
		request<T>(url, {
			method: 'PUT',
			body: body instanceof FormData ? body : JSON.stringify(body)
		}),
	patch: <T>(url: string, body: unknown) =>
		request<T>(url, {
			method: 'PATCH',
			body: body instanceof FormData ? body : JSON.stringify(body)
		}),
	delete: <T>(url: string) => request<T>(url, { method: 'DELETE' })
};
