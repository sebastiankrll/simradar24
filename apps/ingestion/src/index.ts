import "dotenv/config";
import { pgCleanupStalePilots, pgUpsertPilots, pgUpsertTrackPoints } from "@sk/db/pg";
import { rdsPubWsDelta, rdsSetMultiple, rdsSetSingle } from "@sk/db/redis";
import type { TrackPoint, VatsimData, VatsimTransceivers, WsAll, WsDelta } from "@sk/types/vatsim";
import axios from "axios";
import { getAirportDelta, getAirportShort, mapAirports } from "./airport.js";
import { getControllerDelta, mapControllers } from "./controller.js";
import { updateDashboardData } from "./dashboard.js";
import { getPilotDelta, getPilotShort, mapPilots } from "./pilot.js";

const VATSIM_DATA_URL = "https://data.vatsim.net/v3/vatsim-data.json";
const VATSIM_TRANSCEIVERS_URL = "https://data.vatsim.net/v3/transceivers-data.json";
const FETCH_INTERVAL = 5_000;

let updating = false;
let lastVatsimUpdate = 0;
let lastPgCleanUp = 0;

async function fetchVatsimData(): Promise<void> {
	if (updating) return;

	updating = true;
	try {
		const vatsimResponse = await axios.get<VatsimData>(VATSIM_DATA_URL);
		const vatsimData = vatsimResponse.data;
		const timestmap = new Date(vatsimData.general.update_timestamp).getTime();

		if (timestmap > lastVatsimUpdate) {
			lastVatsimUpdate = timestmap;

			const transceiversResponse = await axios.get<VatsimTransceivers[]>(VATSIM_TRANSCEIVERS_URL);
			vatsimData.transceivers = transceiversResponse.data;

			const pilotsLong = await mapPilots(vatsimData);
			const [controllersLong, controllersMerged] = await mapControllers(vatsimData, pilotsLong);
			const airportsLong = await mapAirports(pilotsLong);

			// Publish minimal websocket data on redis ws:short
			const delta: WsDelta = {
				pilots: getPilotDelta(),
				airports: getAirportDelta(),
				controllers: getControllerDelta(),
			};
			rdsPubWsDelta(delta);

			// Set full websocket data on redis ws:all
			const all: WsAll = {
				pilots: pilotsLong.map(getPilotShort),
				airports: airportsLong.map(getAirportShort),
				controllers: controllersMerged,
			};
			rdsSetSingle("ws:all", all);

			// Set pilots, controllers and airports data in redis
			rdsSetMultiple(pilotsLong, "pilot", (p) => p.id, "pilots:live", 120);
			rdsSetMultiple(controllersLong, "controller", (c) => c.callsign, "controllers:live", 120);
			rdsSetMultiple(airportsLong, "airport", (a) => a.icao, "airports:live", 120);

			// Insert trackpoints in TimescaleDB
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
			await pgUpsertTrackPoints(trackPoints);
			await pgUpsertPilots(pilotsLong);

			const now = Date.now();
			if (now > lastPgCleanUp + 30 * 60 * 1000) {
				lastPgCleanUp = now;
				await pgCleanupStalePilots();
			}

			// Update dashboard data
			updateDashboardData(vatsimData, controllersLong);

			console.log(`✅ Retrieved ${vatsimData.pilots.length} pilots and ${vatsimData.controllers.length} controllers.`);
		} else {
			// console.log("Nothing changed.")
		}
	} catch (error) {
		console.error("❌ Error fetching VATSIM data:", error instanceof Error ? error.message : error);
	}
	updating = false;
}

fetchVatsimData();
setInterval(fetchVatsimData, FETCH_INTERVAL);
