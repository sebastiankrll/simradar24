import "dotenv/config";
import { pgGetTrackPointsByid } from "@sk/db/pg";
import { rdsGetSingle } from "@sk/db/redis";
import cors from "cors";
import express from "express";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/static/versions", async (_req, res) => {
	try {
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
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

app.get("/api/static/:type", async (req, res) => {
	try {
		const { type } = req.params;
		const allowedTypes = ["airports", "tracons", "firs", "airlines"];

		if (!allowedTypes.includes(type)) return res.status(400).json({ error: "Invalid static data type" });

		const data = await rdsGetSingle(`static_${type}:all`);
		if (!data) return res.status(404).json({ error: "Static data not found" });

		res.json(data);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

app.get("/api/data/init", async (_req, res) => {
	try {
		const all = await rdsGetSingle("ws:all");
		if (!all) return res.status(404).json({ error: "Initial data not found" });

		res.json(all);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

app.get("/api/data/pilot/:callsign", async (req, res) => {
	try {
		const { callsign } = req.params;
		console.log("Requested pilot:", callsign);

		const pilot = await rdsGetSingle(`pilot:${callsign}`);
		if (!pilot) return res.status(404).json({ error: "Pilot not found" });

		res.json(pilot);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

app.get("/api/data/airport/:icao", async (req, res) => {
	try {
		const { icao } = req.params;
		console.log("Requested airport:", icao);

		const airport = await rdsGetSingle(`airport:${icao}`);
		if (!airport) return res.status(404).json({ error: "Airport not found" });

		res.json(airport);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

app.get("/api/data/controller/:callsign", async (req, res) => {
	try {
		const { callsign } = req.params;
		console.log("Requested controller:", callsign);

		const controller = await rdsGetSingle(`controller:${callsign}`);
		if (!controller) return res.status(404).json({ error: "Controller not found" });

		res.json(controller);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

app.get("/api/data/track/:id", async (req, res) => {
	try {
		const { id } = req.params;
		console.log("Requested track:", id);

		const trackPoints = await pgGetTrackPointsByid(id);

		res.json(trackPoints);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Express API listening on port ${PORT}`);
});
