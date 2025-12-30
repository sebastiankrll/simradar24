import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface CustomRequest extends Request {
	user?: {
		cid: number;
	};
	compression?: {
		encoding: "br" | "gzip";
		cacheKeySuffix: "br" | "gzip";
	};
}

export const errorHandler =
	(fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | Promise<any>) => (req: Request, res: Response, next: NextFunction) => {
		Promise.resolve(fn(req, res, next)).catch(next);
	};

interface JWTPayload {
	vatsim?: {
		cid: number;
	};
	sub?: string;
}

export const authHandler = (req: CustomRequest, res: Response, next: NextFunction) => {
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

type CompressionInfo = {
	encoding: "br" | "gzip";
	cacheKeySuffix: "br" | "gzip";
};

export function compressionHandler(req: CustomRequest, res: Response, next: NextFunction) {
	const ae = req.headers["accept-encoding"] || "";

	if (ae.includes("br")) {
		req.compression = {
			encoding: "br",
			cacheKeySuffix: "br",
		} satisfies CompressionInfo;
		return next();
	}

	if (ae.includes("gzip")) {
		req.compression = {
			encoding: "gzip",
			cacheKeySuffix: "gzip",
		} satisfies CompressionInfo;
		return next();
	}

	res.status(406).end();
}
