import "dotenv/config";
import { pgGetAirportPilots, pgGetTrackPointsByid } from "@sk/db/pg";
import { rdsGetMultiple, rdsGetRingStorage, rdsGetSingle } from "@sk/db/redis";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

const limiter = rateLimit({
	windowMs: 60_000,
	max: 60,
	message: "Too many requests from this endpoint, please try again later.",
	standardHeaders: true,
	legacyHeaders: false,
});

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(limiter);

// Async error wrapper
const asyncHandler =
	(fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void> | Promise<any>) =>
	(req: express.Request, res: express.Response, next: express.NextFunction) => {
		Promise.resolve(fn(req, res, next)).catch(next);
	};

app.get(
	"/static/versions",
	asyncHandler(async (_req, res) => {
		const airportsVersion = await rdsGetSingle("static_airports:version");
		const firsVersion = await rdsGetSingle("static_firs:version");
		const traconsVersion = await rdsGetSingle("static_tracons:version");
		const airlinesVersion = await rdsGetSingle("static_airlines:version");

		res.json({
			airportsVersion,
			firsVersion,
			traconsVersion,
			airlinesVersion,
		});
	}),
);

app.get(
	"/static/:type",
	asyncHandler(async (req, res) => {
		const { type } = req.params;
		const allowedTypes = ["airports", "tracons", "firs", "airlines"];

		if (!allowedTypes.includes(type)) {
			return res.status(400).json({ error: "Invalid static data type" });
		}

		const data = await rdsGetSingle(`static_${type}:all`);
		if (!data) {
			return res.status(404).json({ error: "Static data not found" });
		}

		res.json(data);
	}),
);

app.get(
	"/data/init",
	asyncHandler(async (_req, res) => {
		const all = await rdsGetSingle("ws:all");
		if (!all) {
			return res.status(404).json({ error: "Initial data not found" });
		}

		res.json(all);
	}),
);

app.get(
	"/data/pilot/:id",
	asyncHandler(async (req, res) => {
		const { id } = req.params;

		const pilot = await rdsGetSingle(`pilot:${id}`);
		if (!pilot) {
			return res.status(404).json({ error: "Pilot not found" });
		}

		res.json(pilot);
	}),
);

app.get(
	"/data/airport/:icao",
	asyncHandler(async (req, res) => {
		const { icao } = req.params;

		const airport = await rdsGetSingle(`airport:${icao}`);
		if (!airport) {
			return res.status(404).json({ error: "Airport not found" });
		}

		res.json(airport);
	}),
);

app.get(
	"/data/controllers/:callsigns",
	asyncHandler(async (req, res) => {
		const { callsigns } = req.params;

		const controllers = await rdsGetMultiple("controller", callsigns.split(","));
		const validControllers = controllers.filter((controller) => controller !== null);
		if (validControllers.length === 0) {
			return res.status(404).json({ error: "Controller not found" });
		}

		res.json(validControllers);
	}),
);

app.get(
	"/data/track/:id",
	asyncHandler(async (req, res) => {
		const { id } = req.params;

		const trackPoints = await pgGetTrackPointsByid(id);
		if (!trackPoints || trackPoints.length === 0) {
			return res.status(404).json({ error: "Track not found" });
		}

		res.json(trackPoints);
	}),
);

app.get(
	"/data/aircraft/:reg",
	asyncHandler(async (req, res) => {
		const { reg } = req.params;

		const aircraft = await rdsGetSingle(`static_fleet:${reg}`);
		if (!aircraft) {
			return res.status(404).json({ error: "Aircraft not found" });
		}

		res.json(aircraft);
	}),
);

app.get(
	"/data/dashboard/",
	asyncHandler(async (_req, res) => {
		const stats = await rdsGetSingle(`dashboard:stats`);
		const history = await rdsGetRingStorage(`dashboard:history`, 24 * 60 * 60 * 1000);
		const events = await rdsGetSingle(`dashboard:events`);

		if (!stats || !history || !events) {
			return res.status(404).json({ error: "Dashboard data not found" });
		}

		res.json({ stats, history, events });
	}),
);

app.get(
	"/data/airport/:icao/flights",
	asyncHandler(async (req, res) => {
		const icao = String(req.params.icao).toUpperCase();
		const direction = (String(req.query.direction || "dep").toLowerCase() === "arr" ? "arr" : "dep") as "dep" | "arr";
		const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 20));
		const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
		const afterCursor = typeof req.query.afterCursor === "string" ? req.query.afterCursor : undefined;

		const data = await pgGetAirportPilots(icao, direction, limit, cursor, afterCursor);
		res.json(data);
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
app.listen(PORT, () => {
	console.log(`Express API listening on port ${PORT}`);
});
