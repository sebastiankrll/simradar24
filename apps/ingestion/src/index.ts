import "dotenv/config";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import { pgDeleteStalePilots, pgUpsertPilots } from "@sr24/db/pg";
import { rdsConnect, rdsPub, rdsSetMultiple, rdsSetMultipleTimeSeries, rdsSetSingle } from "@sr24/db/redis";
import type { AirportShort, PilotShort, TrackPoint, VatsimData, VatsimTransceivers, WsAll, WsDelta } from "@sr24/types/vatsim";
import axios from "axios";
import { getAirportDelta, getAirportShort, mapAirports } from "./airport.js";
import { getControllerDelta, mapControllers } from "./controller.js";
import { updateDashboardData } from "./dashboard.js";
import { getPilotDelta, getPilotShort, mapPilots } from "./pilot.js";

const VATSIM_DATA_URL = "https://data.vatsim.net/v3/vatsim-data.json";
const VATSIM_TRANSCEIVERS_URL = "https://data.vatsim.net/v3/transceivers-data.json";
const FETCH_INTERVAL = 5_000;

let dbsInitialized = false;
let updating = false;
let lastVatsimUpdate = 0;
let lastPgCleanUp = 0;

async function fetchVatsimData(): Promise<void> {
	if (updating) return;
	updating = true;

	if (!dbsInitialized) {
		await rdsConnect();
		dbsInitialized = true;
	}

	try {
		const vatsimData = await axios.get<VatsimData>(VATSIM_DATA_URL).then((res) => res.data);
		const timestmap = new Date(vatsimData.general.update_timestamp).getTime();

		if (timestmap <= lastVatsimUpdate) {
			updating = false;
			return;
		}
		lastVatsimUpdate = timestmap;
		vatsimData.transceivers = await axios.get<VatsimTransceivers[]>(VATSIM_TRANSCEIVERS_URL).then((res) => res.data);

		const pilotsLong = await mapPilots(vatsimData);
		const [controllersLong, controllersMerged] = await mapControllers(vatsimData, pilotsLong);
		const airportsLong = await mapAirports(pilotsLong);

		const delta: WsDelta = {
			pilots: getPilotDelta(),
			airports: getAirportDelta(),
			controllers: getControllerDelta(),
			timestamp: new Date(vatsimData.general.update_timestamp),
		};
		rdsPub("ws:delta", delta);

		const all: WsAll = {
			pilots: pilotsLong.map((p) => getPilotShort(p) as Required<PilotShort>),
			airports: airportsLong.map((a) => getAirportShort(a) as Required<AirportShort>),
			controllers: controllersMerged,
		};
		const raw = JSON.stringify(all);
		const br = brotliCompressSync(raw, {
			params: { [constants.BROTLI_PARAM_QUALITY]: 4 },
		});
		const gz = gzipSync(raw, { level: 3 });
		await rdsSetSingle("ws:all:br", br.toString("base64"));
		await rdsSetSingle("ws:all:gzip", gz.toString("base64"));

		// Set pilots, controllers and airports data in redis
		rdsSetMultiple(pilotsLong, "pilot", (p) => p.id, "pilots:live", 120);
		rdsSetMultiple(controllersLong, "controller", (c) => c.callsign, "controllers:live", 120);
		rdsSetMultiple(airportsLong, "airport", (a) => a.icao, "airports:live", 120);

		await pgUpsertPilots(pilotsLong);
		const now = Date.now();
		if (now > lastPgCleanUp + 60 * 60 * 1000) {
			lastPgCleanUp = now;
			await pgDeleteStalePilots();
		}

		const trackPoints: TrackPoint[] = pilotsLong.map((p) => ({
			id: p.id,
			cid: p.cid,
			latitude: p.latitude,
			longitude: p.longitude,
			altitude_agl: p.altitude_agl,
			altitude_ms: p.altitude_ms,
			groundspeed: p.groundspeed,
			vertical_speed: p.vertical_speed,
			heading: p.heading,
			timestamp: p.timestamp,
		}));
		await rdsSetMultipleTimeSeries(trackPoints, "pilot:tp", (tp) => tp.id, 12 * 60 * 60);

		// Update dashboard data
		await updateDashboardData(vatsimData, controllersLong);

		// console.log(`✅ Retrieved ${vatsimData.pilots.length} pilots and ${vatsimData.controllers.length} controllers.`);
	} catch (error) {
		console.error("❌ Error fetching VATSIM data:", error instanceof Error ? error.message : error);
	}

	updating = false;
}

fetchVatsimData();
setInterval(fetchVatsimData, FETCH_INTERVAL);
