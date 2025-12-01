import { promisify } from "node:util";
import * as zlib from "node:zlib";
import type { AirportDelta, AirportLong, AirportShort, PilotLong } from "@sk/types/vatsim";
import axios from "axios";
import { parseStringPromise } from "xml2js";

interface MetarXML {
	response?: {
		data?: Array<{
			METAR?: Array<{
				station_id?: string[];
				raw_text?: string[];
			}>;
		}>;
	};
}

interface TafXML {
	response?: {
		data?: Array<{
			TAF?: Array<{
				station_id?: string[];
				raw_text?: string[];
			}>;
		}>;
	};
}

const METAR_URL = "https://aviationweather.gov/data/cache/metars.cache.xml.gz";
const TAF_URL = "https://aviationweather.gov/data/cache/tafs.cache.xml.gz";
const WEATHER_FETCH_INTERVAL = 600_000;

let cached: AirportLong[] = [];
let deleted: string[] = [];
let updated: AirportShort[] = [];
let added: AirportShort[] = [];

export async function mapAirports(pilotsLong: PilotLong[]): Promise<AirportLong[]> {
	await updateWeather();

	const airportRecord: Record<string, AirportLong> = {};
	const routeRecord: Record<string, Map<string, number>> = {};

	for (const pilotLong of pilotsLong) {
		if (!pilotLong.flight_plan?.departure.icao) continue;

		const departure = pilotLong.flight_plan.departure;
		const arrival = pilotLong.flight_plan.arrival;

		// Add airport if not existing already
		if (!airportRecord[departure.icao]) {
			airportRecord[departure.icao] = initAirportRecord(departure.icao);
		}

		if (!airportRecord[arrival.icao]) {
			airportRecord[arrival.icao] = initAirportRecord(arrival.icao);
		}

		const depTraffic = airportRecord[departure.icao].dep_traffic;
		depTraffic.traffic_count++;

		const depDelay = calculateDepartureDelay(pilotLong);
		if (depDelay !== 0) {
			depTraffic.flights_delayed++;
			depTraffic.average_delay = Math.round((depTraffic.average_delay * (depTraffic.flights_delayed - 1) + depDelay) / depTraffic.flights_delayed);
		}

		const arrTraffic = airportRecord[arrival.icao].arr_traffic;
		arrTraffic.traffic_count++;

		const arrDelay = calculateArrivalDelay(pilotLong);
		if (arrDelay !== 0) {
			arrTraffic.flights_delayed++;
			arrTraffic.average_delay = Math.round((arrTraffic.average_delay * (arrTraffic.flights_delayed - 1) + arrDelay) / arrTraffic.flights_delayed);
		}

		const setRoute = (icao: string, route: string) => {
			if (!routeRecord[icao]) routeRecord[icao] = new Map();

			const current = routeRecord[icao].get(route) || 0;
			routeRecord[icao].set(route, current + 1);
		};

		const route = `${departure.icao}-${arrival.icao}`;
		setRoute(departure.icao, route);
		setRoute(arrival.icao, route);
	}

	// Get busiest and total routes
	for (const icao of Object.keys(routeRecord)) {
		const routes = routeRecord[icao];
		if (!routes) continue;

		let busiestDeparture = "-";
		let busiestArrival = "-";
		let busiestDepCount = 0;
		let busiestArrCount = 0;
		let uniqueDepartures = 0;
		let uniqueArrivals = 0;

		routes.forEach((count, route) => {
			const [depIcao, arrIcao] = route.split("-");
			if (depIcao === icao) {
				uniqueDepartures++;
				if (count > busiestDepCount) {
					busiestDeparture = route;
					busiestDepCount = count;
				}
			} else if (arrIcao === icao) {
				uniqueArrivals++;
				if (count > busiestArrCount) {
					busiestArrival = route;
					busiestArrCount = count;
				}
			}
		});

		airportRecord[icao].busiest = {
			departure: busiestDeparture,
			arrival: busiestArrival,
		};
		airportRecord[icao].unique = {
			departures: uniqueDepartures,
			arrivals: uniqueArrivals,
		};
	}

	const airportsLong = Object.values(airportRecord);

	const deletedLong = cached.filter((a) => !airportsLong.some((b) => b.icao === a.icao));
	const addedLong = airportsLong.filter((a) => !cached.some((b) => b.icao === a.icao));
	const updatedLong = airportsLong.filter((a) => cached.some((b) => b.icao === a.icao));

	deleted = deletedLong.map((a) => a.icao);
	added = addedLong.map(getAirportShort);
	updated = updatedLong.map(getAirportShort);
	// console.log(airportsLong[0])

	cached = airportsLong;
	return airportsLong;
}

export function getAirportShort(a: AirportLong): AirportShort {
	return {
		icao: a.icao,
		dep_traffic: a.dep_traffic,
		arr_traffic: a.arr_traffic,
	};
}

export function getAirportDelta(): AirportDelta {
	return {
		deleted,
		added,
		updated,
	};
}

function initAirportRecord(icao: string): AirportLong {
	return {
		icao: icao,
		dep_traffic: { traffic_count: 0, average_delay: 0, flights_delayed: 0 },
		arr_traffic: { traffic_count: 0, average_delay: 0, flights_delayed: 0 },
		busiest: { departure: "-", arrival: "-" },
		unique: { departures: 0, arrivals: 0 },
		metar: getMetar(icao),
		taf: getTaf(icao),
	};
}

function calculateDepartureDelay(pilot: PilotLong): number {
	if (!pilot.times?.off_block) return 0;
	const times = pilot.times;
	const delay_min = (times.off_block.getTime() - times.sched_off_block.getTime()) / 1000 / 60;

	return Math.min(Math.max(delay_min, 0), 120);
}

function calculateArrivalDelay(pilot: PilotLong): number {
	if (!pilot.times?.on_block) return 0;
	const times = pilot.times;
	const delay_min = (times.on_block.getTime() - times.sched_on_block.getTime()) / 1000 / 60;

	return Math.min(Math.max(delay_min, 0), 120);
}

const gunzip = promisify(zlib.gunzip);
let metarCache: Map<string, string> = new Map();
let tafCache: Map<string, string> = new Map();
let lastWeatherFetch = 0;

async function fetchWeather(url: string): Promise<MetarXML | TafXML> {
	const response = await axios.get<Buffer>(url, {
		responseType: "arraybuffer",
	});

	const decompressed = await gunzip(response.data);
	const xml = decompressed.toString("utf-8");

	const parsed = (await parseStringPromise(xml)) as MetarXML | TafXML;

	return parsed;
}

async function updateWeather(): Promise<void> {
	if (Date.now() - lastWeatherFetch < WEATHER_FETCH_INTERVAL) {
		return;
	}
	lastWeatherFetch = Date.now();

	try {
		const parsedMetar = (await fetchWeather(METAR_URL)) as MetarXML;
		const parsedTaf = (await fetchWeather(TAF_URL)) as TafXML;

		const metars = parsedMetar?.response?.data?.[0]?.METAR || [];
		const tafs = parsedTaf?.response?.data?.[0]?.TAF || [];

		const newMetarCache = new Map<string, string>();
		const newTafCache = new Map<string, string>();

		for (const metar of metars) {
			const icao = metar.station_id?.[0];
			const raw = metar.raw_text?.[0];

			if (icao && raw) {
				newMetarCache.set(icao, raw);
			}
		}

		for (const taf of tafs) {
			const icao = taf.station_id?.[0];
			const raw = taf.raw_text?.[0];

			if (icao && raw) {
				newTafCache.set(icao, raw);
			}
		}

		metarCache = newMetarCache;
		tafCache = newTafCache;

		console.log(`✅ Updated ${metarCache.size} METAR entries and ${tafCache.size} TAF entries`);
	} catch (error) {
		console.error("❌ Error fetching weather data:", error instanceof Error ? error.message : error);
	}
}

export function getMetar(icao: string): string | null {
	return metarCache.get(icao) || null;
}

export function getTaf(icao: string): string | null {
	return tafCache.get(icao) || null;
}
