import type { FIRFeature, SimAwareTraconFeature, StaticAirline, StaticAirport } from "@sk/types/db";
import Dexie, { type EntityTable } from "dexie";

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

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function dxInitDatabases(): Promise<void> {
	const serverVersions = (await fetch(`${BASE_URL}/static/versions`).then((res) => res.json())) as StaticVersions;
	const localVersions: StaticVersions = JSON.parse(localStorage.getItem("databaseVersions") || "{}");

	if (serverVersions.airportsVersion !== localVersions.airportsVersion) {
		const entries = (await fetchStaticData("airports")) as StaticAirport[];
		storeData(entries, db.airports as EntityTable<any, "id">);
	}

	if (serverVersions.firsVersion !== localVersions.firsVersion) {
		const features = (await fetchStaticData("firs")) as FIRFeature[];
		const entries: DexieFeature[] = features.map((f) => ({
			id: f.properties.id,
			feature: f,
		}));

		storeData(entries, db.firs as EntityTable<any, "id">);
	}

	if (serverVersions.traconsVersion !== localVersions.traconsVersion) {
		const features = (await fetchStaticData("tracons")) as SimAwareTraconFeature[];
		const entries: DexieFeature[] = features.map((f) => ({
			id: f.properties.id,
			feature: f,
		}));

		storeData(entries, db.tracons as EntityTable<any, "id">);
	}

	if (serverVersions.airlinesVersion !== localVersions.airlinesVersion) {
		const entries = (await fetchStaticData("airlines")) as StaticAirline[];
		storeData(entries, db.airlines as EntityTable<any, "id">);
	}

	localStorage.setItem("databaseVersions", JSON.stringify(serverVersions));
}

async function fetchStaticData(type: string): Promise<any> {
	const response = await fetch(`${BASE_URL}/static/${type}`);
	const data = await response.json();

	return data;
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
