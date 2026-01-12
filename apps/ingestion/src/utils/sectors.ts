import { rdsGetSingle } from "@sr24/db/redis";
import type { FIRFeature, SimAwareTraconFeature } from "@sr24/types/db";

let currentFirsVersion: string | null = null;
let currentTraconsVersion: string | null = null;

const firPrefixes: Map<string, string> = new Map();
const traconPrefixes: Map<string, string> = new Map();

export async function updateSectorPrefixes(): Promise<void> {
	const firsVersion = await rdsGetSingle("static_firs:version");
	const traconsVersion = await rdsGetSingle("static_tracons:version");

	if (currentFirsVersion !== firsVersion) {
		const features = (await rdsGetSingle("static_firs:all")) as FIRFeature[] | undefined;
		if (features) {
			firPrefixes.clear();
			features.forEach((f) => {
				const prefix = f.properties.callsign_prefix;
				const id = f.properties.id;
				if (prefix === "") {
					firPrefixes.set(id, id);
				} else {
					firPrefixes.set(prefix, id);
				}
			});

			currentFirsVersion = firsVersion;
		}
	}

	if (currentTraconsVersion !== traconsVersion) {
		const features = (await rdsGetSingle("static_tracons:all")) as SimAwareTraconFeature[] | undefined;
		if (features) {
			traconPrefixes.clear();
			features.forEach((f) => {
				const prefixes = f.properties.prefix;

				if (typeof prefixes === "string") {
					traconPrefixes.set(prefixes, f.properties.id);
				} else {
					prefixes.forEach((prefix) => {
						traconPrefixes.set(prefix, f.properties.id);
					});
				}
			});

			currentTraconsVersion = traconsVersion;
		}
	}
}

export function reduceCallsign(callsign: string): string[] {
	const parts = callsign.split("_");
	const levels: string[] = [];

	for (let i = parts.length; i > 0; i--) {
		levels.push(parts.slice(0, i).join("_"));
	}

	return levels;
}

export function findPrefixMatch(levels: string[], facility: number): string | null {
	const lookup = facility === 6 ? firPrefixes : traconPrefixes;

	for (const lvl of levels) {
		const match = lookup.get(lvl);
		if (match) return match;
	}
	return null;
}

export function parseAirportFacility(callsign: string): number {
	// GND, DEL, TWR
	const suffix = callsign.split("_").pop()?.toUpperCase();
	switch (suffix) {
		case "TWR":
			return 4;
		case "GND":
			return 3;
		case "DEL":
			return 2;
		default:
			return 4;
	}
}
