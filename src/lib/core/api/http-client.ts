export class HttpError extends Error {
	constructor(
		readonly status: number,
		readonly body: string
	) {
		super(`HTTP ${status}: ${body}`);
		this.name = 'HttpError';
	}
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
		try {
			message = JSON.parse(message).message ?? message;
		} catch {
			// keep raw body
		}
		throw new HttpError(response.status, message);
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
