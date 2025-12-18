import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

interface JWTPayload {
	vatsim?: {
		cid: number;
	};
	sub?: string;
}

export interface AuthRequest extends Request {
	user?: {
		cid: number;
	};
}

export const authHandler = (req: AuthRequest, res: Response, next: NextFunction) => {
	const authHeader = req.headers.authorization;
	const token = authHeader?.split(" ")[1];

	if (!token) {
		res.status(401).json({ error: "Authentication required" });
		return;
	}

	const secret = process.env.NEXTAUTH_SECRET;
	if (!secret) {
		console.error("NEXTAUTH_SECRET is not set");
		res.status(500).json({ error: "Server configuration error" });
		return;
	}

	try {
		const decoded = jwt.verify(token, secret) as JWTPayload;

		if (!decoded.vatsim?.cid) {
			res.status(401).json({ error: "Invalid token" });
			return;
		}

		req.user = {
			cid: decoded.vatsim.cid,
		};
		next();
	} catch (_err) {
		res.status(403).json({ error: "Invalid or expired token" });
	}
};
