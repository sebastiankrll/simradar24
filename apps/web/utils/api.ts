const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface ApiResponse<T> {
	data: T;
	status: number;
	ok: boolean;
}

interface ApiError {
	message: string;
	status: number;
	error?: any;
}

class ApiClient {
	private baseUrl: string;

	constructor(baseUrl: string = API_URL) {
		this.baseUrl = baseUrl;
	}

	async fetch<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
		try {
			const response = await fetch(`${this.baseUrl}${endpoint}`, {
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

			return {
				data,
				status,
				ok,
			};
		} catch (err) {
			const error = err as ApiError;
			// console.error(`API Error (${endpoint}):`, error.message);
			throw error;
		}
	}

	async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
		const response = await this.fetch<T>(endpoint, {
			...options,
			method: "GET",
		});
		return response.data;
	}

	async post<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
		const response = await this.fetch<T>(endpoint, {
			...options,
			method: "POST",
			body: body ? JSON.stringify(body) : undefined,
		});
		return response.data;
	}

	async put<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
		const response = await this.fetch<T>(endpoint, {
			...options,
			method: "PUT",
			body: body ? JSON.stringify(body) : undefined,
		});
		return response.data;
	}

	async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
		const response = await this.fetch<T>(endpoint, {
			...options,
			method: "DELETE",
		});
		return response.data;
	}
}

const apiClient = new ApiClient(API_URL);

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
	return apiClient.get<T>(endpoint, options);
}

export async function postApi<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
	return apiClient.post<T>(endpoint, body, options);
}

export async function putApi<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
	return apiClient.put<T>(endpoint, body, options);
}

export async function deleteApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
	return apiClient.delete<T>(endpoint, options);
}
