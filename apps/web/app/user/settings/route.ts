import { sign } from "jsonwebtoken";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "";
const API_URL = process.env.API_URL || "http://localhost:3001/api";

export async function GET(req: NextRequest): Promise<Response> {
	const token = await getToken({ req });

	if (!token?.vatsim?.cid) {
		return Response.json({ settings: {} }, { status: 200 });
	}

	const jwtToken = sign({ vatsim: token.vatsim }, JWT_SECRET, { expiresIn: "30m" });

	try {
		const response = await fetch(`${API_URL}/user/settings`, {
			headers: {
				Authorization: `Bearer ${jwtToken}`,
				"Content-Type": "application/json",
			},
		});

		const data = await response.json();
		return Response.json(data);
	} catch (err) {
		console.error("Failed to fetch settings:", err);
		return Response.json({ error: "Failed to fetch settings" }, { status: 500 });
	}
}

export async function POST(req: NextRequest): Promise<Response> {
	const token = await getToken({ req });

	if (!token?.vatsim?.cid) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const settings = await req.json();
	const jwtToken = sign({ vatsim: token.vatsim }, JWT_SECRET, { expiresIn: "30m" });

	try {
		const response = await fetch(`${API_URL}/user/settings`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${jwtToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(settings),
		});

		const data = await response.json();
		return Response.json(data);
	} catch (err) {
		console.error("Failed to save settings:", err);
		return Response.json({ error: "Failed to save settings" }, { status: 500 });
	}
}
