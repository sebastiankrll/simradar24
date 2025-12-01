import "dotenv/config";
import { pgGetAirportPilots, pgGetTrackPointsByid } from "@sk/db/pg";
import { rdsGetRingStorage, rdsGetSingle } from "@sk/db/redis";
import cors from "cors";
import express from "express";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/static/versions", async (_req, res) => {
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

app.get("/static/:type", async (req, res) => {
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

app.get("/data/init", async (_req, res) => {
    try {
        const all = await rdsGetSingle("ws:all");
        if (!all) return res.status(404).json({ error: "Initial data not found" });

        res.json(all);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/data/pilot/:id", async (req, res) => {
    try {
        const { id } = req.params;
        // console.log("Requested pilot:", id);

        const pilot = await rdsGetSingle(`pilot:${id}`);
        if (!pilot) return res.status(404).json({ error: "Pilot not found" });

        res.json(pilot);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/data/airport/:icao", async (req, res) => {
    try {
        const { icao } = req.params;
        // console.log("Requested airport:", icao);

        const airport = await rdsGetSingle(`airport:${icao}`);
        if (!airport) return res.status(404).json({ error: "Airport not found" });

        res.json(airport);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/data/controller/:callsign", async (req, res) => {
    try {
        const { callsign } = req.params;
        // console.log("Requested controller:", callsign);

        const controller = await rdsGetSingle(`controller:${callsign}`);
        if (!controller) return res.status(404).json({ error: "Controller not found" });

        res.json(controller);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/data/track/:id", async (req, res) => {
    try {
        const { id } = req.params;
        // console.log("Requested track:", id);

        const trackPoints = await pgGetTrackPointsByid(id);

        res.json(trackPoints);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/data/aircraft/:reg", async (req, res) => {
    try {
        const { reg } = req.params;
        // console.log("Requested aircraft:", reg);

        const aircraft = await rdsGetSingle(`fleet:${reg}`);
        if (!aircraft) return res.status(404).json({ error: "Aircraft not found" });

        res.json(aircraft);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/data/dashboard/", async (_req, res) => {
    try {
        const stats = await rdsGetSingle(`dashboard:stats`);
        const history = await rdsGetRingStorage(`dashboard:history`, 24 * 60 * 60 * 1000);
        const events = await rdsGetSingle(`dashboard:events`);
        if (!stats || !history || !events) return res.status(404).json({ error: "Dashboard data not found" });

        res.json({ stats, history, events });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /data/airport/<icao>/flights?direction=<direction>&limit=<limit>&cursor=<base64string>
app.get("/data/airport/:icao/flights", async (req, res) => {
    try {
        const icao = String(req.params.icao).toUpperCase();
        const direction = (String(req.query.direction || "dep").toLowerCase() === "arr" ? "arr" : "dep") as "dep" | "arr";
        const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
        const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;

        // console.log(`Requested ${direction === "dep" ? "departures" : "arrivals"} for airport: ${icao}`);

        const data = await pgGetAirportPilots(icao, direction, limit, cursor);
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => {
    console.log(`Express API listening on port ${PORT}`);
});
