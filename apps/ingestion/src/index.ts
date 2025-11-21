import "dotenv/config";
import { pgInsertTrackPoints } from "@sk/db/pg";
import { rdsPubWsShort, rdsSetMultiple } from "@sk/db/redis";
import type {
	AirportLong,
	ControllerLong,
	PilotLong,
	TrackPoint,
	VatsimData,
	VatsimTransceivers,
} from "@sk/types/vatsim";
import axios from "axios";
import { mapAirports } from "./airport.js";
import { mapControllers } from "./controller.js";
import { mapPilots } from "./pilot.js";

const VATSIM_DATA_URL = "https://data.vatsim.net/v3/vatsim-data.json";
const VATSIM_TRANSCEIVERS_URL =
	"https://data.vatsim.net/v3/transceivers-data.json";
const FETCH_INTERVAL = 5_000;

let updating = false;
let lastUpdateTimestamp = "2000-01-01T00:00:00.00000Z";

async function fetchVatsimData(): Promise<void> {
	if (updating) return;

	updating = true;
	try {
		const vatsimResponse = await axios.get<VatsimData>(VATSIM_DATA_URL);
		const vatsimData = vatsimResponse.data;

		if (
			new Date(vatsimData.general.update_timestamp) >
			new Date(lastUpdateTimestamp)
		) {
			lastUpdateTimestamp = vatsimData.general.update_timestamp;

			const transceiversResponse = await axios.get<VatsimTransceivers[]>(
				VATSIM_TRANSCEIVERS_URL,
			);
			vatsimData.transceivers = transceiversResponse.data;

			const pilotsLong = await mapPilots(vatsimData);
			const controllersLong = mapControllers(vatsimData, pilotsLong);
			const airportsLong = mapAirports(pilotsLong);

			// Publish minimal websocket data on redis ws:short
			publishWsShort(pilotsLong, controllersLong, airportsLong);
			// Set pilots, controllers and airports data in redis
			await rdsSetMultiple(
				pilotsLong,
				"pilot",
				(p) => p.callsign,
				"pilots:live",
				120,
			);
			await rdsSetMultiple(
				controllersLong,
				"controller",
				(c) => c.callsign,
				"controllers:live",
				120,
			);
			await rdsSetMultiple(
				airportsLong,
				"airport",
				(a) => a.icao,
				"airports:live",
				120,
			);
			// Insert trackpoints in TimescaleDB
			insertTrackPoints(pilotsLong);

			console.log(
				`✅ Retrieved ${vatsimData.pilots.length} pilots and ${vatsimData.controllers.length} controllers.`,
			);
		} else {
			// console.log("Nothing changed.")
		}
	} catch (error) {
		console.error(
			"❌ Error fetching VATSIM data:",
			error instanceof Error ? error.message : error,
		);
	}
	updating = false;
}

function publishWsShort(
	pilotsLong: PilotLong[],
	controllersLong: ControllerLong[],
	airportsLong: AirportLong[],
): void {
	const wsShort = {
		pilots: pilotsLong.map(
			({
				latitude,
				longitude,
				altitude_agl,
				altitude_ms,
				groundspeed,
				vertical_speed,
				heading,
				callsign,
				aircraft,
				transponder,
				frequency,
			}) => ({
				callsign,
				latitude,
				longitude,
				altitude_agl: Math.round(altitude_agl / 250) * 250,
				altitude_ms: Math.round(altitude_ms / 250) * 250,
				groundspeed,
				vertical_speed,
				heading,
				aircraft,
				transponder,
				frequency,
			}),
		),
		controllers: controllersLong.map(
			({ callsign, frequency, facility, atis, connections }) => ({
				callsign,
				frequency,
				facility,
				atis,
				connections,
			}),
		),
		airports: airportsLong.map(({ icao, dep_traffic, arr_traffic }) => ({
			icao,
			dep_traffic,
			arr_traffic,
		})),
	};
	rdsPubWsShort(wsShort);
}

function insertTrackPoints(pilotsLong: PilotLong[]): void {
	const trackPoints: TrackPoint[] = pilotsLong.map((p) => ({
		uid: p.uid,
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

	// console.log(trackPoints[0])
	pgInsertTrackPoints(trackPoints);
}

fetchVatsimData();
setInterval(fetchVatsimData, FETCH_INTERVAL);
