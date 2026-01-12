import "dotenv/config";
import { pgDeleteStalePilots, pgUpsertPilots } from "@sr24/db/pg";
import { rdsConnectBufferClient, rdsPub, rdsSetTrackpoints } from "@sr24/db/redis";
import type { InitialData, RedisAll, WsDelta } from "@sr24/types/interface";
import type { VatsimData, VatsimTransceivers } from "@sr24/types/vatsim";
import axios from "axios";
import { getAirportDelta, getAirportShort, mapAirports } from "./airport.js";
import { getControllerDelta, mapControllers } from "./controller.js";
import { updateDashboardData } from "./dashboard.js";
import { getPilotDelta, getPilotShort, mapPilots } from "./pilot.js";
import { mapTrackPoints } from "./tracks.js";
import { updateSectorPrefixes } from "./utils/sectors.js";
import { updateBookingsData } from "./bookings.js";

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
		const vatsimData = await axios.get<VatsimData>(VATSIM_DATA_URL).then((res) => res.data);
		const timestmap = new Date(vatsimData.general.update_timestamp).getTime();

		if (timestmap <= lastVatsimUpdate) {
			updating = false;
			return;
		}
		// console.time("VATSIM Data Fetch");

		lastVatsimUpdate = timestmap;
		vatsimData.transceivers = await axios.get<VatsimTransceivers[]>(VATSIM_TRANSCEIVERS_URL).then((res) => res.data);

		await updateSectorPrefixes();

		const pilotsLong = await mapPilots(vatsimData);
		const [controllersLong, controllersMerged] = await mapControllers(vatsimData, pilotsLong);
		const airportsLong = await mapAirports(pilotsLong);

		const trackPoints = mapTrackPoints(pilotsLong);
		await rdsSetTrackpoints(trackPoints);

		await pgUpsertPilots(pilotsLong);
		const now = Date.now();
		if (now > lastPgCleanUp + 60 * 60 * 1000) {
			lastPgCleanUp = now;
			await pgDeleteStalePilots();
		}

		const dashboard = await updateDashboardData(vatsimData, controllersLong);
		updateBookingsData();

		const init: InitialData = {
			pilots: pilotsLong.map((p) => getPilotShort(p)),
			airports: airportsLong.map((a) => getAirportShort(a)),
			controllers: controllersMerged,
			timestamp: new Date(vatsimData.general.update_timestamp),
		};

		const redisAll: RedisAll = {
			pilots: pilotsLong,
			controllers: controllersLong,
			airports: airportsLong,
			dashboard: dashboard,
			init,
		};
		rdsPub("data:all", redisAll);

		const delta: WsDelta = {
			pilots: getPilotDelta(),
			airports: getAirportDelta(),
			controllers: getControllerDelta(),
			timestamp: new Date(vatsimData.general.update_timestamp),
		};
		rdsPub("ws:delta", delta);

		// console.timeEnd("VATSIM Data Fetch");
	} catch (error) {
		console.error("❌ Error fetching VATSIM data:", error instanceof Error ? error.message : error);
	}

	updating = false;
}

await rdsConnectBufferClient();
await fetchVatsimData();
setInterval(fetchVatsimData, FETCH_INTERVAL);
