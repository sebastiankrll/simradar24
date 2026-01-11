import type { FIRFeature, SimAwareTraconFeature, StaticAircraftType, StaticAirline, StaticAirport } from "@sr24/types/db";
import Dexie, { type EntityTable } from "dexie";
import type { StatusSetter } from "@/types/initializer";
import { fetchApi } from "@/utils/api";

interface StaticVersions {
	airportsVersion: string;
	traconsVersion: string;
	firsVersion: string;
	airlinesVersion: string;
	aircraftsVersion: string;
}
interface DexieFeature {
	id: string;
	feature: FIRFeature | SimAwareTraconFeature;
}
type Manifest = { key: string; versions: StaticVersions };

const R2_BUCKET_URL = process.env.NODE_ENV === "development" ? process.env.NEXT_PUBLIC_R2_BUCKET_URL_DEV : process.env.NEXT_PUBLIC_R2_BUCKET_URL;

const db = new Dexie("StaticDatabase") as Dexie & {
	airports: EntityTable<StaticAirport, "id">;
	firs: EntityTable<DexieFeature, "id">;
	tracons: EntityTable<DexieFeature, "id">;
	airlines: EntityTable<StaticAirline, "id">;
	aircrafts: EntityTable<StaticAircraftType, "icao">;
	manifest: EntityTable<Manifest, "key">;
};

db.version(1).stores({
	airports: "id",
	firs: "id",
	tracons: "id",
	airlines: "id",
	aircrafts: "icao",
	manifest: "key",
});

let initPromise: Promise<void> | null = null;

export function dxEnsureInitialized(setStatus?: StatusSetter): Promise<void> {
	if (!initPromise) {
		initPromise = dxInitDatabases(setStatus).catch((err) => {
			initPromise = null;
			throw err;
		});
	}
	return initPromise;
}

export function dxDatabaseIsStale(): boolean {
	const lastCheck = localStorage.getItem("simradar21-db");
	const now = Date.now();
	if (lastCheck && now - parseInt(lastCheck, 10) < 12 * 60 * 60 * 1000) {
		return false;
	}
	return true;
}

async function dxInitDatabases(setStatus?: StatusSetter): Promise<void> {
	const latestManifest = await fetchApi<StaticVersions>(`${R2_BUCKET_URL}/manifest.json`, {
		cache: "no-store",
	});
	const storedManifest = (await db.manifest.get("databaseVersions")) as Manifest | undefined;

	if (latestManifest.airportsVersion !== storedManifest?.versions.airportsVersion) {
		const entries = (await fetchApi<StaticAirport[]>(`${R2_BUCKET_URL}/airports_${latestManifest.airportsVersion}.json`, {
			cache: "no-store",
		})) as StaticAirport[];
		storeData(entries, db.airports as EntityTable<any, "id">);
	}
	setStatus?.((prev) => ({ ...prev, airports: true }));

	if (latestManifest.firsVersion !== storedManifest?.versions.firsVersion) {
		const features = (await fetchApi<FIRFeature[]>(`${R2_BUCKET_URL}/firs_${latestManifest.firsVersion}.json`, {
			cache: "no-store",
		})) as FIRFeature[];
		const entries: DexieFeature[] = features.map((f) => ({
			id: f.properties.id,
			feature: f,
		}));

		storeData(entries, db.firs as EntityTable<any, "id">);
	}
	setStatus?.((prev) => ({ ...prev, firs: true }));

	if (latestManifest.traconsVersion !== storedManifest?.versions.traconsVersion) {
		const features = (await fetchApi<SimAwareTraconFeature[]>(`${R2_BUCKET_URL}/tracons_${latestManifest.traconsVersion}.json`, {
			cache: "no-store",
		})) as SimAwareTraconFeature[];
		const entries: DexieFeature[] = features.map((f) => ({
			id: f.properties.id,
			feature: f,
		}));

		storeData(entries, db.tracons as EntityTable<any, "id">);
	}
	setStatus?.((prev) => ({ ...prev, tracons: true }));

	if (latestManifest.airlinesVersion !== storedManifest?.versions.airlinesVersion) {
		const entries = (await fetchApi<StaticAirline[]>(`${R2_BUCKET_URL}/airlines_${latestManifest.airlinesVersion}.json`, {
			cache: "no-store",
		})) as StaticAirline[];
		storeData(entries, db.airlines as EntityTable<any, "id">);
	}
	setStatus?.((prev) => ({ ...prev, airlines: true }));

	if (latestManifest.aircraftsVersion !== storedManifest?.versions.aircraftsVersion) {
		const entries = (await fetchApi<StaticAircraftType[]>(`${R2_BUCKET_URL}/aircrafts_${latestManifest.aircraftsVersion}.json`, {
			cache: "no-store",
		})) as StaticAircraftType[];
		storeData(entries, db.aircrafts as EntityTable<StaticAircraftType, "icao">);
	}
	setStatus?.((prev) => ({ ...prev, aircrafts: true }));

	await db.manifest.put({ key: "databaseVersions", versions: latestManifest });
	localStorage.setItem("simradar21-db", Date.now().toString());
}

async function storeData<T, K extends keyof T>(data: T[], db: EntityTable<T, K>): Promise<void> {
	db.bulkPut(data)
		.then(() => {
			console.log("Done adding data");
		})
		.catch((e) => {
			if (e.name === "BulkError") {
				console.error(`Some items did not succeed. Completed: ${e.failures.length}`);
			} else {
				throw e;
			}
		});
}

export async function dxGetAllAirports(): Promise<StaticAirport[]> {
	await dxEnsureInitialized();
	return await db.airports.toArray();
}

export async function dxGetAirport(id: string): Promise<StaticAirport | null> {
	await dxEnsureInitialized();
	return (await db.airports.get(id)) || null;
}

export async function dxGetAirline(id: string): Promise<StaticAirline | null> {
	await dxEnsureInitialized();
	return (await db.airlines.get(id)) || null;
}

export async function dxFindAirlines(query: string, limit: number): Promise<StaticAirline[]> {
	await dxEnsureInitialized();
	return await db.airlines
		.filter((airline) => startsAtWord(airline.name, query) || airline.id.toLowerCase().startsWith(query.toLowerCase()))
		.limit(limit)
		.toArray();
}

export async function dxFindAircrafts(query: string, limit: number): Promise<StaticAircraftType[]> {
	await dxEnsureInitialized();
	return await db.aircrafts
		.filter((aircraft) => startsAtWord(aircraft.name, query) || aircraft.icao.toLowerCase().startsWith(query.toLowerCase()))
		.limit(limit)
		.toArray();
}

export async function dxFindAirports(query: string, limit: number): Promise<StaticAirport[]> {
	await dxEnsureInitialized();
	return await db.airports
		.filter((airport) => startsAtWord(airport.name, query) || airport.id.toLowerCase().startsWith(query.toLowerCase()))
		.limit(limit)
		.toArray();
}

function startsAtWord(param: string, query: string): boolean {
	const q = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const regex = new RegExp(`\\b${q}`, "i");
	return regex.test(param);
}

export async function dxGetTracons(ids: string[]): Promise<(DexieFeature | undefined)[]> {
	await dxEnsureInitialized();
	return await db.tracons.bulkGet(ids);
}

export async function dxGetFirs(ids: string[]): Promise<(DexieFeature | undefined)[]> {
	await dxEnsureInitialized();
	return await db.firs.bulkGet(ids);
}
