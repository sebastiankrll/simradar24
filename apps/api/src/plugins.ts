import type { FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import jwt from "jsonwebtoken";

interface JWTPayload {
	vatsim?: {
		cid: number;
	};
	sub?: string;
}

declare module "fastify" {
	interface FastifyRequest {
		user?: { cid: number };
	}

	interface FastifyInstance {
		authenticate: (request: FastifyRequest) => Promise<void>;
	}
}

export const authPlugin = fp(async (fastify) => {
	fastify.decorateRequest("user");

	fastify.decorate("authenticate", async (request: FastifyRequest) => {
		const authHeader = request.headers.authorization;
		const token = authHeader?.split(" ")[1];

		if (!token) {
			throw fastify.httpErrors.unauthorized("Authentication required");
		}

		const secret = process.env.NEXTAUTH_SECRET;
		if (!secret) {
			request.log.error("NEXTAUTH_SECRET is not set");
			throw fastify.httpErrors.internalServerError("Server configuration error");
		}

		try {
			const decoded = jwt.verify(token, secret) as JWTPayload;

			if (!decoded.vatsim?.cid) {
				throw fastify.httpErrors.unauthorized("Invalid token");
			}

			request.user = { cid: decoded.vatsim.cid };
		} catch {
			throw fastify.httpErrors.forbidden("Invalid or expired token");
		}
	});
});
