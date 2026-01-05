import "dotenv/config";
import { inflateSync } from "node:zlib";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifySensible from "@fastify/sensible";
import { decodeTrackpoints, parseTrackPointBuffer } from "@sr24/db/buffer";
import { pgHealthCheck, pgShutdown, prisma } from "@sr24/db/pg";
import { rdsConnectBufferClient, rdsGetSingle, rdsGetTrackPoints, rdsHealthCheck, rdsShutdown, rdsSub } from "@sr24/db/redis";
import type { AirportLong, ControllerLong, DashboardData, InitialData, PilotLong, RedisAll } from "@sr24/types/interface";
import Fastify from "fastify";
import type { Prisma } from "../../../packages/db/src/generated/prisma/index.js";
import { authPlugin } from "./plugins.js";
import { getMetar, getTaf } from "./weather.js";

await rdsConnectBufferClient();

let initialData: InitialData | null = null;
let dashboardData: DashboardData | null = null;
const pilotsLong: Map<string, PilotLong> = new Map();
const controllersLong: Map<string, ControllerLong> = new Map();
const airportsLong: Map<string, AirportLong> = new Map();

rdsSub("data:all", async (data: string) => {
	try {
		const parsed: RedisAll = JSON.parse(data);
		initialData = parsed.init;
		dashboardData = parsed.dashboard;
		pilotsLong.clear();
		parsed.pilots.forEach((p) => {
			pilotsLong.set(p.id, p);
		});
		controllersLong.clear();
		parsed.controllers.forEach((c) => {
			controllersLong.set(c.callsign, c);
		});
		airportsLong.clear();
		parsed.airports.forEach((a) => {
			airportsLong.set(a.icao, a);
		});
	} catch (err) {
		console.error("Error parsing RedisAll data from subscription:", err);
	}
});

const app = Fastify({
	logger: true,
});

// Compression in traefik
app.register(fastifyHelmet);
app.register(fastifyCors);
app.register(fastifyRateLimit);
app.register(fastifySensible);
app.register(authPlugin);

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

app.get("/map/init", async () => {
	if (!initialData) {
		throw app.httpErrors.serviceUnavailable({ error: "Initial data not available" });
	}
	return initialData;
});

app.get("/map/dashboard", async () => {
	if (!dashboardData) {
		throw app.httpErrors.notFound({ error: "Dashboard data not available" });
	}
	return dashboardData;
});

app.get(
	"/map/pilot/:id",
	{
		schema: {
			params: {
				type: "object",
				properties: { id: { type: "string", minLength: 10, maxLength: 10 } },
				required: ["id"],
			},
		},
	},
	async (request) => {
		const { id } = request.params as { id: string };
		const pilot = pilotsLong.get(id);
		if (!pilot) {
			throw app.httpErrors.notFound({ error: "Pilot not found" });
		}
		return pilot;
	},
);

app.get(
	"/map/pilot/:id/track",
	{
		schema: {
			params: {
				type: "object",
				properties: { id: { type: "string", minLength: 10, maxLength: 10 } },
				required: ["id"],
			},
		},
	},
	async (request) => {
		const { id } = request.params as { id: string };
		const trackPoints = await rdsGetTrackPoints(id);
		if (!trackPoints || trackPoints.length === 0) {
			throw app.httpErrors.notFound({ error: "Track not found" });
		}
		return trackPoints;
	},
);

app.get(
	"/map/airport/:icao",
	{
		schema: {
			params: {
				type: "object",
				properties: { icao: { type: "string", minLength: 4, maxLength: 4 } },
				required: ["icao"],
			},
		},
	},
	async (request) => {
		const { icao } = request.params as { icao: string };
		const airport = airportsLong.get(icao.toUpperCase());
		if (!airport) {
			throw app.httpErrors.notFound({ error: "Airport not found" });
		}
		return airport;
	},
);

app.get(
	"/map/airport/:icao/weather",
	{
		schema: {
			params: {
				type: "object",
				properties: { icao: { type: "string", minLength: 4, maxLength: 4 } },
				required: ["icao"],
			},
		},
	},
	async (request) => {
		const { icao } = request.params as { icao: string };
		const metar = getMetar(icao.toUpperCase());
		const taf = getTaf(icao.toUpperCase());
		return { metar, taf };
	},
);

app.get(
	"/map/airport/:icao/pilots",
	{
		schema: {
			params: {
				type: "object",
				properties: { icao: { type: "string", minLength: 4, maxLength: 4 } },
				required: ["icao"],
			},
			querystring: {
				type: "object",
				properties: {
					direction: { type: "string", enum: ["arr", "dep"] },
					limit: { type: "string", pattern: "^[0-9]+$" },
					cursor: { type: "string" },
					backwards: { type: "string", enum: ["true", "false"] },
				},
			},
		},
	},
	async (request) => {
		const { icao } = request.params as { icao: string };
		const { direction, limit, cursor, backwards } = request.query as { direction?: string; limit?: string; cursor?: string; backwards?: string };

		const normalizedDirection = (direction || "dep").toLowerCase() === "arr" ? "arr" : "dep";
		const normalizedLimit = Number(limit || 20);
		const normalizedBackwards = backwards === "true";

		const dirCol = normalizedDirection === "dep" ? "dep_icao" : "arr_icao";
		const timeCol = normalizedDirection === "dep" ? "sched_off_block" : "sched_on_block";

		const where: any = {
			[dirCol]: icao.toUpperCase(),
			[timeCol]: { not: null },
		};
		if (!cursor) {
			where[timeCol] = { gte: new Date() };
		}

		return await prisma.pilot.findMany({
			take: normalizedBackwards ? -(normalizedLimit + 1) : normalizedLimit + 1,
			skip: cursor ? 1 : 0,
			cursor: cursor
				? {
						id: cursor,
					}
				: undefined,
			where,
			orderBy: {
				[timeCol]: "asc",
			},
			select: {
				id: true,
				callsign: true,
				aircraft: true,
				flight_plan: true,
				times: true,
				live: true,
			},
		});
	},
);

app.get(
	"/map/controller/:callsigns",
	{
		schema: {
			params: {
				type: "object",
				properties: { callsigns: { type: "string", minLength: 4 } },
				required: ["callsigns"],
			},
		},
	},
	async (request) => {
		const { callsigns } = request.params as { callsigns: string };
		const callsignArray = callsigns.split(",");

		if (callsignArray.length === 0) {
			throw app.httpErrors.badRequest({ error: "At least one callsign is required" });
		}

		const controllers = callsignArray.map((callsign) => controllersLong.get(callsign) || null);
		const validControllers = controllers.filter((controller) => controller !== null);
		if (validControllers.length === 0) {
			throw app.httpErrors.notFound({ error: "Controllers not found" });
		}
		return validControllers;
	},
);

app.get(
	"/search",
	{
		schema: {
			querystring: {
				type: "object",
				properties: { q: { type: "string", minLength: 3 } },
				required: ["q"],
			},
		},
	},
	async (request) => {
		const { q: query } = request.query as { q?: string };
		if (!query || query.length < 1) {
			throw app.httpErrors.badRequest({ error: "Query parameter 'q' is required" });
		}

		const whereClause: Prisma.PilotWhereInput = {
			OR: [
				{ callsign: { contains: query.toUpperCase() } },
				{ dep_icao: { contains: query.toUpperCase() } },
				{ arr_icao: { contains: query.toUpperCase() } },
				{ cid: { contains: query } },
				{ name: { contains: query, mode: "insensitive" } },
			],
		};

		const [livePilots, offlinePilots] = await Promise.all([
			prisma.pilot.findMany({
				where: {
					...whereClause,
					live: true,
				},
				orderBy: {
					callsign: "asc",
				},
				select: {
					id: true,
					callsign: true,
					flight_plan: true,
					aircraft: true,
					live: true,
				},
				take: 10,
			}),

			prisma.pilot.findMany({
				where: {
					...whereClause,
					live: false,
				},
				orderBy: {
					callsign: "asc",
				},
				distinct: ["callsign"],
				select: {
					id: true,
					callsign: true,
					flight_plan: true,
					aircraft: true,
					live: true,
				},
				take: 10,
			}),
		]);

		return {
			live: livePilots,
			offline: offlinePilots,
		};
	},
);

app.get(
	"/search/airline",
	{
		schema: {
			querystring: {
				type: "object",
				properties: { q: { type: "string", minLength: 3 } },
				required: ["q"],
			},
		},
	},
	async (request) => {
		const { q: query } = request.query as { q?: string };
		if (!query || query.length < 1) {
			throw app.httpErrors.badRequest({ error: "Query parameter 'q' is required" });
		}

		const [livePilots, offlinePilots] = await Promise.all([
			prisma.pilot.findMany({
				where: {
					callsign: { contains: query.toUpperCase() },
					live: true,
				},
				orderBy: {
					callsign: "asc",
				},
				select: {
					id: true,
					callsign: true,
					flight_plan: true,
					aircraft: true,
					live: true,
				},
				take: 10,
			}),

			prisma.pilot.findMany({
				where: {
					callsign: { contains: query.toUpperCase() },
					live: false,
				},
				orderBy: {
					callsign: "asc",
				},
				distinct: ["callsign"],
				select: {
					id: true,
					callsign: true,
					flight_plan: true,
					aircraft: true,
					live: true,
				},
				take: 10,
			}),
		]);

		return {
			live: livePilots,
			offline: offlinePilots,
		};
	},
);

app.get(
	"/search/route",
	{
		schema: {
			querystring: {
				type: "object",
				properties: { q: { type: "string", minLength: 3 } },
				required: ["q"],
			},
		},
	},
	async (request) => {
		const { q: query } = request.query as { q?: string };
		if (!query || query.length < 1) {
			throw app.httpErrors.badRequest({ error: "Query parameter 'q' is required" });
		}

		const icaos = query.split("-");
		if (icaos.length !== 2) {
			throw app.httpErrors.badRequest({ error: "Query parameter 'q' must be in the format DEP-ARR" });
		}

		const whereClause: Prisma.PilotWhereInput = {
			AND: [{ dep_icao: icaos[0].toUpperCase() }, { arr_icao: icaos[1].toUpperCase() }],
		};

		const [livePilots, offlinePilots] = await Promise.all([
			prisma.pilot.findMany({
				where: {
					...whereClause,
					live: true,
				},
				orderBy: {
					callsign: "asc",
				},
				select: {
					id: true,
					callsign: true,
					flight_plan: true,
					aircraft: true,
					live: true,
				},
				take: 10,
			}),

			prisma.pilot.findMany({
				where: {
					...whereClause,
					live: false,
				},
				orderBy: {
					callsign: "asc",
				},
				distinct: ["callsign"],
				select: {
					id: true,
					callsign: true,
					flight_plan: true,
					aircraft: true,
					live: true,
				},
				take: 10,
			}),
		]);

		return {
			live: livePilots,
			offline: offlinePilots,
		};
	},
);

app.get(
	"/data/flights/callsign/:callsign",
	{
		schema: {
			params: {
				type: "object",
				properties: { callsign: { type: "string", minLength: 3 } },
				required: ["callsign"],
			},
			querystring: {
				type: "object",
				properties: {
					limit: { type: "string", pattern: "^[0-9]+$" },
					cursor: { type: "string" },
				},
			},
		},
	},
	async (request) => {
		const { callsign } = request.params as { callsign: string };
		const { limit, cursor } = request.query as { limit?: string; cursor?: string };

		return await prisma.pilot.findMany({
			where: {
				callsign,
			},
			orderBy: {
				sched_off_block: "desc",
			},
			take: Number(limit || 20),
			...(cursor && {
				skip: 1,
				cursor: {
					id: cursor,
				},
			}),
			select: {
				id: true,
				callsign: true,
				aircraft: true,
				flight_plan: true,
				times: true,
				live: true,
			},
		});
	},
);

app.get(
	"/data/flights/registration/:registration",
	{
		schema: {
			params: {
				type: "object",
				properties: { registration: { type: "string", minLength: 3 } },
				required: ["registration"],
			},
			querystring: {
				type: "object",
				properties: {
					limit: { type: "string", pattern: "^[0-9]+$" },
					cursor: { type: "string" },
				},
			},
		},
	},
	async (request) => {
		const { registration } = request.params as { registration: string };
		const { limit, cursor } = request.query as { limit?: string; cursor?: string };

		return await prisma.pilot.findMany({
			where: {
				ac_reg: registration,
			},
			orderBy: {
				sched_off_block: "desc",
			},
			take: Number(limit || 20),
			...(cursor && {
				skip: 1,
				cursor: {
					id: cursor,
				},
			}),
			select: {
				id: true,
				callsign: true,
				aircraft: true,
				flight_plan: true,
				times: true,
				live: true,
			},
		});
	},
);

app.get(
	"/data/pilot/:id",
	{
		schema: {
			params: {
				type: "object",
				properties: { id: { type: "string", minLength: 10, maxLength: 10 } },
				required: ["id"],
			},
		},
	},
	async (request) => {
		const { id } = request.params as { id: string };
		const pilot = await prisma.pilot.findUnique({
			where: { id },
		});
		const trackPoint = await prisma.trackpoint.findUnique({
			where: { id },
		});

		if (!pilot) {
			throw app.httpErrors.notFound({ error: "Pilot not found" });
		}

		const compressed = trackPoint?.points;
		if (!compressed) return { pilot };

		const blob = inflateSync(compressed);
		const buffers = parseTrackPointBuffer(blob);
		const trackPoints = decodeTrackpoints(buffers, true);

		return { pilot, trackPoints };
	},
);

app.get(
	"/data/aircraft/:reg",
	{
		schema: {
			params: {
				type: "object",
				properties: { reg: { type: "string", minLength: 4, maxLength: 8 } },
				required: ["reg"],
			},
		},
	},
	async (request) => {
		const { reg } = request.params as { reg: string };
		const aircraft = await rdsGetSingle(`static_fleet:${reg.toUpperCase()}`);
		if (!aircraft) {
			throw app.httpErrors.notFound({ error: "Aircraft not found" });
		}
		return aircraft;
	},
);

app.get(
	"/user/settings",
	{
		preHandler: app.authenticate,
	},
	async (request) => {
		const cid = BigInt(request.user?.cid || 0);
		const user = await prisma.user.findUnique({
			where: { cid },
			select: { settings: true },
		});
		if (!user) {
			throw app.httpErrors.notFound({ error: "User not found" });
		}
		return { settings: user.settings || {} };
	},
);

app.post(
	"/user/settings",
	{
		preHandler: app.authenticate,
	},
	async (request) => {
		const cid = BigInt(request.user?.cid || 0);
		const settings = request.body;

		if (!settings || typeof settings !== "object") {
			throw app.httpErrors.badRequest({ error: "Invalid settings data." });
		}

		const user = await prisma.user.upsert({
			where: { cid },
			update: { settings },
			create: { cid, settings },
		});
		return { settings: user.settings };
	},
);

const PORT = process.env.API_PORT || 3001;
app
	.listen({ port: Number(PORT), host: "0.0.0.0" })
	.then(() => console.log(`Fastify API listening on port ${PORT}`))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});

const gracefulShutdown = async (signal: string) => {
	console.log(`\n${signal} signal received: closing HTTP server`);
	await app.close();
	try {
		await rdsShutdown();
	} catch {}
	try {
		await pgShutdown();
	} catch {}
	process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
