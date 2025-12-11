interface ApiError {
	message: string;
	status: number;
	error?: any;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
	const isAbsolute = /^https?:\/\//i.test(endpoint);
	const url = isAbsolute ? endpoint : `${API_URL}${endpoint}`;

	const response = await fetch(url, {
		...options,
		cache: "no-store",
		headers: {
			"Content-Type": "application/json",
			...options?.headers,
		},
	});

	const status = response.status;
	const ok = response.ok;

	let data: T;

	try {
		data = await response.json();
	} catch {
		data = {} as T;
	}

	if (!ok) {
		throw {
			message: (data as any)?.error || `HTTP ${status}`,
			status,
			error: data,
		} as ApiError;
	}

	return data;
}
