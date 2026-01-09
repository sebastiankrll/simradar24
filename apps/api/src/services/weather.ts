import { promisify } from "node:util";
import * as zlib from "node:zlib";
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
const WEATHER_FETCH_INTERVAL = 15 * 60 * 1000;

const gunzip = promisify(zlib.gunzip);
let metarCache: Map<string, string> = new Map();
let tafCache: Map<string, string> = new Map();

updateWeather();
setInterval(updateWeather, WEATHER_FETCH_INTERVAL);

async function updateWeather(): Promise<void> {
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

		// console.log(`✅ Updated ${metarCache.size} METAR entries and ${tafCache.size} TAF entries`);
	} catch (error) {
		console.error("❌ Error fetching weather data:", error instanceof Error ? error.message : error);
	}
}

async function fetchWeather(url: string): Promise<MetarXML | TafXML> {
	const response = await axios.get<Buffer>(url, {
		responseType: "arraybuffer",
	});

	const decompressed = await gunzip(response.data);
	const xml = decompressed.toString("utf-8");

	const parsed = (await parseStringPromise(xml)) as MetarXML | TafXML;

	return parsed;
}

export function getMetar(icao: string): string | null {
	return metarCache.get(icao) || null;
}

export function getTaf(icao: string): string | null {
	return tafCache.get(icao) || null;
}
