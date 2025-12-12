import type { FIRFeature, SimAwareTraconFeature, StaticAirline, StaticAirport } from "@sr24/types/db";
import Dexie, { type EntityTable } from "dexie";
import { fetchApi } from "@/utils/api";

interface StaticVersions {
	airportsVersion: string;
	traconsVersion: string;
	firsVersion: string;
	airlinesVersion: string;
}

interface DexieFeature {
	id: string;
	feature: FIRFeature | SimAwareTraconFeature;
}

const R2_BUCKET_URL = process.env.NODE_ENV === "development" ? process.env.NEXT_PUBLIC_R2_BUCKET_URL_DEV : process.env.NEXT_PUBLIC_R2_BUCKET_URL;

const db = new Dexie("StaticDatabase") as Dexie & {
	airports: EntityTable<StaticAirport, "id">;
	firs: EntityTable<DexieFeature, "id">;
	tracons: EntityTable<DexieFeature, "id">;
	airlines: EntityTable<StaticAirline, "id">;
};

db.version(1).stores({
	airports: "id",
	firs: "id",
	tracons: "id",
	airlines: "id",
});

export async function dxInitDatabases(): Promise<void> {
	const manifest = await fetchApi<StaticVersions>(`${R2_BUCKET_URL}/manifest.json`, {
		cache: "no-store",
	});
	const localVersions: StaticVersions = JSON.parse(localStorage.getItem("databaseVersions") || "{}");

	if (manifest.airportsVersion !== localVersions.airportsVersion) {
		const entries = (await fetchApi<StaticAirport[]>(`${R2_BUCKET_URL}/airports_${manifest.airportsVersion}.json`, {
			cache: "no-store",
		})) as StaticAirport[];
		storeData(entries, db.airports as EntityTable<any, "id">);
	}

	if (manifest.firsVersion !== localVersions.firsVersion) {
		const features = (await fetchApi<FIRFeature[]>(`${R2_BUCKET_URL}/firs_${manifest.firsVersion}.json`, { cache: "no-store" })) as FIRFeature[];
		const entries: DexieFeature[] = features.map((f) => ({
			id: f.properties.id,
			feature: f,
		}));

		storeData(entries, db.firs as EntityTable<any, "id">);
	}

	if (manifest.traconsVersion !== localVersions.traconsVersion) {
		const features = (await fetchApi<SimAwareTraconFeature[]>(`${R2_BUCKET_URL}/tracons_${manifest.traconsVersion}.json`, {
			cache: "no-store",
		})) as SimAwareTraconFeature[];
		const entries: DexieFeature[] = features.map((f) => ({
			id: f.properties.id,
			feature: f,
		}));

		storeData(entries, db.tracons as EntityTable<any, "id">);
	}

	if (manifest.airlinesVersion !== localVersions.airlinesVersion) {
		const entries = (await fetchApi<StaticAirline[]>(`${R2_BUCKET_URL}/airlines_${manifest.airlinesVersion}.json`, {
			cache: "no-store",
		})) as StaticAirline[];
		storeData(entries, db.airlines as EntityTable<any, "id">);
	}

	localStorage.setItem("databaseVersions", JSON.stringify(manifest));
}

async function storeData(data: any[], db: EntityTable<any, "id">): Promise<void> {
	db.bulkPut(data)
		.then(() => {
			console.log("Done adding data");
		})
		.catch((e) => {
			if (e.name === "BulkError") {
				console.error(`Some airports did not succeed. Completed: ${e.failures.length}`);
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

export async function dxGetTracons(ids: string[]): Promise<(DexieFeature | undefined)[]> {
	return await db.tracons.bulkGet(ids);
}

export async function dxGetFirs(ids: string[]): Promise<(DexieFeature | undefined)[]> {
	return await db.firs.bulkGet(ids);
}
