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

export async function dxInitDatabases(setStatus: StatusSetter): Promise<void> {
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
	return await db.airports.toArray();
}

export async function dxGetAirport(id: string): Promise<StaticAirport | null> {
	return (await db.airports.get(id)) || null;
}

export async function dxGetAirline(id: string): Promise<StaticAirline | null> {
	return (await db.airlines.get(id)) || null;
}

export async function dxFindAirlines(query: string, limit: number): Promise<StaticAirline[]> {
	return await db.airlines
		.filter((airline) => airline.name.toLowerCase().includes(query.toLowerCase()) || airline.id.toLowerCase().includes(query.toLowerCase()))
		.limit(limit)
		.toArray();
}

export async function dxFindAircrafts(query: string, limit: number): Promise<StaticAircraftType[]> {
	return await db.aircrafts
		.filter((aircraft) => aircraft.name.toLowerCase().includes(query.toLowerCase()) || aircraft.icao.toLowerCase().includes(query.toLowerCase()))
		.limit(limit)
		.toArray();
}

export async function dxFindAirports(query: string, limit: number): Promise<StaticAirport[]> {
	return await db.airports
		.filter((airport) => airport.name.toLowerCase().includes(query.toLowerCase()) || airport.id.toLowerCase().includes(query.toLowerCase()))
		.limit(limit)
		.toArray();
}

export async function dxGetTracons(ids: string[]): Promise<(DexieFeature | undefined)[]> {
	return await db.tracons.bulkGet(ids);
}

export async function dxGetFirs(ids: string[]): Promise<(DexieFeature | undefined)[]> {
	return await db.firs.bulkGet(ids);
}
