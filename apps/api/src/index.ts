import "dotenv/config";
import { pgFindAirportFlights, pgHealthCheck, pgShutdown, prisma } from "@sr24/db/pg";
import { rdsConnect, rdsGetMultiple, rdsGetRing, rdsGetSingle, rdsGetTimeSeries, rdsHealthCheck, rdsShutdown } from "@sr24/db/redis";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { type AuthRequest, authHandler } from "./auth.js";
import { errorHandler } from "./error.js";
import { validateCallsign, validateICAO, validateNumber, validateString } from "./validation.js";
import { getMetar, getTaf } from "./weather.js";

rdsConnect();

const limiter = rateLimit({
	windowMs: 60_000,
	max: 60,
	message: "Too many requests from this endpoint, please try again later.",
	standardHeaders: true,
	legacyHeaders: false,
});

const app = express();

if (process.env.TRUST_PROXY === "true") {
	app.set("trust proxy", 1);
}

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(limiter);

// Health check endpoints
app.get(
	"/health",
	errorHandler(async (_req, res) => {
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

		res.status(statusCode).json({
			...health,
			responseTime: `${responseTime}ms`,
		});
	}),
);

app.get(
	"/health/live",
	errorHandler(async (_req, res) => {
		res.json({
			status: "alive",
			timestamp: new Date().toISOString(),
		});
	}),
);

app.get(
	"/health/ready",
	errorHandler(async (_req, res) => {
		try {
			const redisHealthy = await rdsHealthCheck();
			const pgHealthy = await pgHealthCheck();

			if (!redisHealthy || !pgHealthy) {
				const reasons: string[] = [];
				if (!redisHealthy) reasons.push("Redis connection failed");
				if (!pgHealthy) reasons.push("PostgreSQL connection failed");

				res.status(503).json({
					status: "not-ready",
					reasons,
					timestamp: new Date().toISOString(),
				});
				return;
			}

			res.json({
				status: "ready",
				timestamp: new Date().toISOString(),
			});
		} catch (_err) {
			res.status(503).json({
				status: "not-ready",
				reasons: ["Health check failed"],
				timestamp: new Date().toISOString(),
			});
		}
	}),
);

app.get(
	"/data/init",
	errorHandler(async (_req, res) => {
		const all = await rdsGetSingle("ws:all");
		if (!all) {
			res.status(404).json({ error: "Initial data not found" });
			return;
		}

		const buffer = Buffer.from(all, "base64");
		res.setHeader("Content-Type", "application/octet-stream");
		res.setHeader("Content-Encoding", "gzip");
		res.send(buffer);
	}),
);

app.get(
	"/data/pilot/:id",
	errorHandler(async (req, res) => {
		const id = validateString(req.params.id, "Pilot ID", 1, 10);

		const pilot = await rdsGetSingle(`pilot:${id}`);
		if (!pilot) {
			res.status(404).json({ error: "Pilot not found" });
			return;
		}

		res.json(pilot);
	}),
);

app.get(
	"/data/airport/:icao",
	errorHandler(async (req, res) => {
		const icao = validateICAO(req.params.icao).toUpperCase();

		const airport = await rdsGetSingle(`airport:${icao}`);
		if (!airport) {
			res.status(404).json({ error: "Airport not found" });
			return;
		}

		res.json(airport);
	}),
);

app.get(
	"/data/weather/:icao",
	errorHandler(async (req, res) => {
		const icao = validateICAO(req.params.icao).toUpperCase();
		const metar = getMetar(icao);
		const taf = getTaf(icao);

		res.json({ metar, taf });
	}),
);

app.get(
	"/data/controllers/:callsigns",
	errorHandler(async (req, res) => {
		const callsignArray = req.params.callsigns.split(",").map((cs) => validateCallsign(cs.trim()));

		if (callsignArray.length === 0) {
			res.status(400).json({ error: "At least one callsign is required" });
			return;
		}

		const controllers = await rdsGetMultiple("controller", callsignArray);
		const validControllers = controllers.filter((controller) => controller !== null);
		if (validControllers.length === 0) {
			res.status(404).json({ error: "Controller not found" });
			return;
		}

		res.json(validControllers);
	}),
);

app.get(
	"/data/track/:id",
	errorHandler(async (req, res) => {
		const id = validateString(req.params.id, "Track ID", 1, 10);

		// const trackPoints = await pgGetTrackPointsByid(id);
		const trackPoints = await rdsGetTimeSeries(`pilot:tp:${id}`);
		if (!trackPoints || trackPoints.length === 0) {
			res.status(404).json({ error: "Track not found" });
			return;
		}

		res.json(trackPoints);
	}),
);

app.get(
	"/data/aircraft/:reg",
	errorHandler(async (req, res) => {
		const reg = validateString(req.params.reg, "Aircraft Registration", 1, 10).toUpperCase();

		const aircraft = await rdsGetSingle(`static_fleet:${reg}`);
		if (!aircraft) {
			res.status(404).json({ error: "Aircraft not found" });
			return;
		}

		res.json(aircraft);
	}),
);

app.get(
	"/data/dashboard/",
	errorHandler(async (_req, res) => {
		const stats = await rdsGetSingle(`dashboard:stats`);
		const history = await rdsGetRing(`dashboard:history`, 24 * 60 * 60 * 1000);
		const events = await rdsGetSingle(`dashboard:events`);

		if (!stats || !history || !events) {
			res.status(404).json({ error: "Dashboard data not found" });
			return;
		}

		res.json({ stats, history, events });
	}),
);

app.get(
	"/data/airport/:icao/flights",
	errorHandler(async (req, res) => {
		const icao = validateICAO(req.params.icao).toUpperCase();
		const direction = (String(req.query.direction || "dep").toLowerCase() === "arr" ? "arr" : "dep") as "dep" | "arr";
		const limit = validateNumber(req.query.limit || 20, "Limit", 1, 30);
		const cursor = req.query.cursor as string | undefined;
		const backwards = req.query.backwards === "true";

		const data = await pgFindAirportFlights(icao, direction, limit, cursor, backwards);
		res.json(data);
	}),
);

app.get(
	"/user/settings",
	authHandler,
	errorHandler(async (req: AuthRequest, res) => {
		const cid = BigInt(req.user?.cid || 0);

		const user = await prisma.user.findUnique({
			where: { cid },
			select: { settings: true },
		});

		if (!user) {
			res.status(404).json({ error: "User not found" });
			return;
		}

		res.json({ settings: user.settings || {} });
	}),
);

app.post(
	"/user/settings",
	authHandler,
	errorHandler(async (req: AuthRequest, res) => {
		const cid = BigInt(req.user?.cid || 0);
		const settings = req.body;

		if (!settings || typeof settings !== "object") {
			res.status(400).json({ error: "Invalid settings data" });
			return;
		}

		const user = await prisma.user.upsert({
			where: { cid },
			update: { settings },
			create: { cid, settings },
		});

		res.json({ settings: user.settings });
	}),
);

app.use((_req, res) => {
	res.status(404).json({ error: "Endpoint not found" });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
	console.error("Error:", err);

	const status = err.status || err.statusCode || 500;
	const message = err.message || "Internal server error";

	res.status(status).json({
		error: message,
		...(process.env.NODE_ENV === "development" && { stack: err.stack }),
	});
});

const PORT = process.env.API_PORT || 3001;
const server = app.listen(PORT, () => {
	console.log(`Express API listening on port ${PORT}`);
});

const gracefulShutdown = async (signal: string) => {
	console.log(`\n${signal} signal received: closing HTTP server`);
	server.close(async () => {
		console.log("HTTP server closed");
		try {
			await rdsShutdown();
		} catch (err) {
			console.error("Error shutting down Redis:", err);
		}
		try {
			await pgShutdown();
		} catch (err) {
			console.error("Error shutting down PostgreSQL:", err);
		}
		process.exit(0);
	});

	// Force shutdown after 10 seconds
	setTimeout(() => {
		console.error("Forced shutdown after timeout");
		process.exit(1);
	}, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
