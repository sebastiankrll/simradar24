import { rdsGetSingle } from "@sr24/db/redis";

const CACHE_DURATION = 15 * 60 * 1000;

type StaticVersions = {
	airportsVersion: string;
	traconsVersion: string;
	firsVersion: string;
	airlinesVersion: string;
	aircraftsVersion: string;
};

let versionsCache: StaticVersions | null = null;
let cacheTimestamp = 0;

export async function getDataVersions(): Promise<StaticVersions> {
	const now = Date.now();
	if (versionsCache && now - cacheTimestamp < CACHE_DURATION) {
		return versionsCache;
	}

	const airlines = await rdsGetSingle("static_airlines:version");
	const aircrafts = await rdsGetSingle("static_aircrafts:version");
	const airports = await rdsGetSingle("static_airports:version");
	const firs = await rdsGetSingle("static_firs:version");
	const tracons = await rdsGetSingle("static_tracons:version");

	const versions: StaticVersions = {
		airlinesVersion: airlines || "unknown",
		aircraftsVersion: aircrafts || "unknown",
		airportsVersion: airports || "unknown",
		firsVersion: firs || "unknown",
		traconsVersion: tracons || "unknown",
	};
	versionsCache = versions;
	cacheTimestamp = now;

	return versions;
}
