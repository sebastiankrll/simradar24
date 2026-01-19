import { sign } from "jsonwebtoken";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

interface ApiError {
	message: string;
	status: number;
	error?: any;
}

const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const API_URL = process.env.API_URL || "http://localhost:3001";
const JWT_SECRET = process.env.NEXTAUTH_SECRET || "";

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
	const isAbsolute = /^https?:\/\//i.test(endpoint);
	const url = isAbsolute ? endpoint : `${NEXT_PUBLIC_API_URL}${endpoint}`;

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

export async function forward(req: NextRequest, path: string) {
	const token = await getToken({ req });
	if (!token?.vatsim?.cid) {
		return new Response("Unauthorized", { status: 401 });
	}

	const jwt = sign({ vatsim: token.vatsim }, JWT_SECRET, {
		expiresIn: "30m",
	});

	const body = req.method !== "GET" ? await req.text() : undefined;

	const headers: Record<string, string> = {
		Authorization: `Bearer ${jwt}`,
	};

	if (body) headers["Content-Type"] = "application/json";

	const res = await fetch(`${API_URL}/user${path}`, {
		method: req.method,
		headers,
		body: body || undefined,
	});

	return new Response(await res.text(), {
		status: res.status,
		headers: res.headers,
	});
}
