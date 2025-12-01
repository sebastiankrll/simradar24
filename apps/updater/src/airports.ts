import { rdsGetSingle, rdsSetMultiple, rdsSetSingle } from "@sk/db/redis";
import type { OurAirportsCsv, StaticAirport } from "@sk/types/db";
import axios from "axios";
import csvParser from "csv-parser";
import { find as findTimezone } from "geo-tz";

const CSV_URL = "https://ourairports.com/data/airports.csv";
const MANUAL_VERSION = "1.0.2";

let version: string | null = null;

export async function updateAirports(): Promise<void> {
	if (!version) {
		await initVersion();
	}
	if (version === MANUAL_VERSION) {
		return;
	}
	const response = await axios.get(CSV_URL, { responseType: "stream" });
	const airports: OurAirportsCsv[] = [];

	await new Promise((resolve, reject) => {
		response.data
			.pipe(csvParser())
			.on("data", (row: OurAirportsCsv) => airports.push(row))
			.on("end", () => resolve(airports))
			.on("error", (err: Error) => reject(err));
	});

	const filteredAirports: StaticAirport[] = airports
		.filter((a) => a.icao_code && a.icao_code.trim() !== "")
		.map((a) => ({
			id: a.icao_code,
			iata: a.iata_code,
			size: a.type,
			name: a.name,
			country: a.iso_country,
			latitude: Number(a.latitude_deg),
			longitude: Number(a.longitude_deg),
			timezone: findTimezone(Number(a.latitude_deg), Number(a.longitude_deg))[0],
		}));

	await rdsSetMultiple(filteredAirports, "static_airport", (a) => a.id, "airports:static");
	await rdsSetSingle("static_airports:all", filteredAirports);
	await rdsSetSingle("static_airports:version", MANUAL_VERSION);

	version = MANUAL_VERSION;
	console.log(`✅ Airports data updated to version ${version}`);
}

async function initVersion(): Promise<void> {
	if (!version) {
		const redisVersion = await rdsGetSingle("static_airports:version");
		version = redisVersion || "0.0.0";
	}
}
