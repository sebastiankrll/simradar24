import "dotenv/config";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifySensible from "@fastify/sensible";
import { pgFindAirportFlights, pgHealthCheck, pgShutdown, prisma } from "@sr24/db/pg";
import { rdsGetSingle, rdsGetTrackPoints, rdsHealthCheck, rdsShutdown, rdsSub } from "@sr24/db/redis";
import type { AirportLong, ControllerLong, DashboardData, InitialData, PilotLong, RedisAll } from "@sr24/types/interface";
import Fastify from "fastify";
import type { Prisma } from "../../../packages/db/src/generated/prisma/index.js";
import { authPlugin } from "./plugins.js";
import { getMetar, getTaf } from "./weather.js";

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

app.setErrorHandler((_error, _request, reply) => {
	reply.status(500).send({ ok: false });
});

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

app.get("/data/init", async () => {
	if (!initialData) {
		throw app.httpErrors.serviceUnavailable({ error: "Initial data not available" });
	}
	return initialData;
});

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
		const pilot = pilotsLong.get(id);
		if (!pilot) {
			throw app.httpErrors.notFound({ error: "Pilot not found" });
		}
		return pilot;
	},
);

app.get(
	"/data/airport/:icao",
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
	"/data/weather/:icao",
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
	"/data/controllers/:callsigns",
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
	"/data/track/:id",
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

app.get("/data/dashboard", async () => {
	if (!dashboardData) {
		throw app.httpErrors.notFound({ error: "Dashboard data not available" });
	}
	return dashboardData;
});

app.get(
	"/data/airport/:icao/flights",
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
		const flights = await pgFindAirportFlights(
			icao.toUpperCase(),
			(direction || "dep").toLowerCase() === "arr" ? "arr" : "dep",
			Number(limit || 20),
			cursor,
			backwards === "true",
		);
		return flights;
	},
);

app.get(
	"/search/flights",
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
					pilot_id: true,
					callsign: true,
					dep_icao: true,
					arr_icao: true,
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
					pilot_id: true,
					callsign: true,
					dep_icao: true,
					arr_icao: true,
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
	"/data/flights/:callsign",
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

		const results = await prisma.pilot.findMany({
			where: {
				callsign,
			},
			orderBy: {
				last_update: "desc",
			},
			take: Number(limit || 20),
			...(cursor && {
				skip: 1,
				cursor: {
					pilot_id: cursor,
				},
			}),
		});

		const pilots: PilotLong[] = results.map((r) => ({
			id: r.pilot_id,
			cid: r.cid,
			callsign: r.callsign,
			latitude: r.latitude,
			longitude: r.longitude,
			altitude_agl: r.altitude_agl,
			altitude_ms: r.altitude_ms,
			groundspeed: r.groundspeed,
			vertical_speed: r.vertical_speed,
			heading: r.heading,
			aircraft: r.aircraft,
			transponder: r.transponder,
			frequency: r.frequency,
			name: r.name,
			server: r.server,
			pilot_rating: r.pilot_rating,
			military_rating: r.military_rating,
			qnh_i_hg: r.qnh_i_hg,
			qnh_mb: r.qnh_mb,
			flight_plan: r.flight_plan as any,
			times: r.times as any,
			logon_time: r.logon_time,
			timestamp: r.last_update,
			live: r.live,
		}));

		return pilots;
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
			throw app.httpErrors.notFound("User not found");
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
