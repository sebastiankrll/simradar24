import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type AirlineInfo = {
	id: string;
	name: string;
	alias: string;
	iata: string;
	icao: string;
	callsign: string;
	country: string;
	active: string;
};

type AirlineStyle = {
	bg: string;
	font: string;
};

type MergedAirline = {
	bg: string | null;
	font: string | null;
	name: string;
	iata: string;
	icao: string;
	callsign: string;
	country: string;
};

const STYLES_PATH = "./src/lib/airline_colors.json";
const AIRLINES_PATH = "./src/lib/airline_data.json";
const OUTPUT_PATH = "./src/lib/airline_DB.json";

const airlines: AirlineInfo[] = JSON.parse(readFileSync(path.resolve(AIRLINES_PATH), "utf8"));
const styles: Record<string, AirlineStyle> = JSON.parse(readFileSync(path.resolve(STYLES_PATH), "utf8"));

function mergeAirlines(airlines: AirlineInfo[], styles: Record<string, AirlineStyle>): MergedAirline[] {
	const out: MergedAirline[] = [];

	for (const a of airlines) {
		if (!a.icao || a.icao === "\\N" || a.icao === "N/A") continue;

		const s = styles[a.icao] ?? null;

		out.push({
			icao: a.icao,
			iata: a.iata,
			name: a.name,
			callsign: a.callsign,
			country: a.country,
			bg: s?.bg ?? null,
			font: s?.font ?? null,
		});
	}

	return out;
}

const merged = mergeAirlines(airlines, styles);
writeFileSync(path.resolve(OUTPUT_PATH), JSON.stringify(merged, null, 2), "utf8");

console.log("✔ Merged airlines saved to:");
