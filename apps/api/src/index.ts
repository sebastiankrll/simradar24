import "dotenv/config";
import { pgGetAirportPilots, pgGetTrackPointsByid } from "@sk/db/pg";
import { rdsGetMultiple, rdsGetRingStorage, rdsGetSingle } from "@sk/db/redis";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { validateCallsign, validateICAO, validateNumber, validateString } from "./validation";

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
		const type = validateString(req.params.type, "Type", 1, 20);
		const allowedTypes = ["airports", "tracons", "firs", "airlines"];

		if (!allowedTypes.includes(type)) {
			res.status(400).json({ error: "Invalid static data type" });
			return;
		}

		const data = await rdsGetSingle(`static_${type}:all`);
		if (!data) {
			res.status(404).json({ error: "Static data not found" });
			return;
		}

		res.json(data);
	}),
);

app.get(
	"/data/init",
	asyncHandler(async (_req, res) => {
		const all = await rdsGetSingle("ws:all");
		if (!all) {
			res.status(404).json({ error: "Initial data not found" });
			return;
		}

		res.json(all);
	}),
);

app.get(
	"/data/pilot/:id",
	asyncHandler(async (req, res) => {
		const id = validateString(req.params.id, "Pilot ID", 1, 50);

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
	asyncHandler(async (req, res) => {
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
	"/data/controllers/:callsigns",
	asyncHandler(async (req, res) => {
		const callsigns = validateString(req.params.callsigns, "Callsigns", 1, 100);
		const callsignArray = callsigns.split(",").map((cs) => validateCallsign(cs.trim()));

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
	asyncHandler(async (req, res) => {
		const id = validateString(req.params.id, "Track ID", 1, 50);

		const trackPoints = await pgGetTrackPointsByid(id);
		if (!trackPoints || trackPoints.length === 0) {
			res.status(404).json({ error: "Track not found" });
			return;
		}

		res.json(trackPoints);
	}),
);

app.get(
	"/data/aircraft/:reg",
	asyncHandler(async (req, res) => {
		const reg = validateString(req.params.reg, "Aircraft Registration", 1, 20).toUpperCase();

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
	asyncHandler(async (_req, res) => {
		const stats = await rdsGetSingle(`dashboard:stats`);
		const history = await rdsGetRingStorage(`dashboard:history`, 24 * 60 * 60 * 1000);
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
	asyncHandler(async (req, res) => {
		const icao = validateICAO(req.params.icao).toUpperCase();
		const direction = (String(req.query.direction || "dep").toLowerCase() === "arr" ? "arr" : "dep") as "dep" | "arr";
		const limit = validateNumber(req.query.limit || 20, "Limit", 1, 200);
		const cursor = typeof req.query.cursor === "string" ? validateString(req.query.cursor, "Cursor", 1, 100) : undefined;
		const afterCursor = typeof req.query.afterCursor === "string" ? validateString(req.query.afterCursor, "AfterCursor", 1, 100) : undefined;

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
