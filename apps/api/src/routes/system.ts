import { pgHealthCheck } from "@sr24/db/pg";
import { rdsHealthCheck } from "@sr24/db/redis";
import type { FastifyPluginAsync } from "fastify";

const systemRoutes: FastifyPluginAsync = async (app) => {
	app.get("/health", async (_request, reply) => {
		const startTime = Date.now();
		const health = {
			status: "ok",
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			services: {
				redis: "unknown",
				postgres: "unknown",
			},
		};

		try {
			const redisHealthy = await rdsHealthCheck();
			health.services.redis = redisHealthy ? "ok" : "error";
			if (!redisHealthy) health.status = "degraded";
		} catch (_err) {
			health.services.redis = "error";
			health.status = "degraded";
		}

		try {
			const pgHealthy = await pgHealthCheck();
			health.services.postgres = pgHealthy ? "ok" : "error";
			if (!pgHealthy) health.status = "degraded";
		} catch (_err) {
			health.services.postgres = "error";
			health.status = "degraded";
		}

		const responseTime = Date.now() - startTime;
		const statusCode = health.status === "ok" ? 200 : 503;

		return reply.status(statusCode).send({
			...health,
			responseTime: `${responseTime}ms`,
		});
	});
};

export default systemRoutes;
