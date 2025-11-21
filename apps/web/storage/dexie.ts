import type {
	FIRFeature,
	FIRFeatureCollection,
	SimAwareTraconFeature,
	SimAwareTraconFeatureCollection,
	StaticAirline,
	StaticAirport,
} from "@sk/types/db";
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
	airports: "id, latitude, longitude, size",
	firs: "id",
	tracons: "id",
	airlines: "id",
});

export async function dxInitLocalDatabase(): Promise<void> {
	checkForNewVersions();
}

async function checkForNewVersions(): Promise<void> {
	const response = await fetch(`http://localhost:5000/api/static/versions`);
	const serverVersions: StaticVersions = await response.json();
	const localVersions: StaticVersions = JSON.parse(
		localStorage.getItem("databaseVersions") || "{}",
	);

	if (serverVersions.airportsVersion !== localVersions.airportsVersion) {
		const airports = (await fetchStaticData("airports")) as StaticAirport[];
		storeData(airports, db.airports as EntityTable<any, "id">);
	}

	if (serverVersions.firsVersion !== localVersions.firsVersion) {
		const collection = (await fetchStaticData("firs")) as FIRFeatureCollection;
		const features: DexieFeature[] = collection.features
			.filter((f) => f.properties?.id && f.properties.id.trim() !== "")
			.map((f) => ({
				id: f.properties.id,
				feature: f,
			}));

		storeData(features, db.firs as EntityTable<any, "id">);
	}

	if (serverVersions.traconsVersion !== localVersions.traconsVersion) {
		const collection = (await fetchStaticData(
			"tracons",
		)) as SimAwareTraconFeatureCollection;
		const features = collection.features
			.filter((f) => f.properties?.id && f.properties.id.trim() !== "")
			.map((f) => ({
				id: f.properties.id,
				feature: f as SimAwareTraconFeature,
			}));

		storeData(features, db.tracons as EntityTable<any, "id">);
	}

	if (serverVersions.airlinesVersion !== localVersions.airlinesVersion) {
		const data = (await fetchStaticData("airlines")) as StaticAirline[];
		storeData(data, db.airlines as EntityTable<any, "id">);
	}

	localStorage.setItem("databaseVersions", JSON.stringify(serverVersions));
}

async function fetchStaticData(type: string): Promise<any> {
	const response = await fetch(`http://localhost:5000/api/static/${type}`);
	const data = await response.json();

	return data;
}

async function storeData(
	data: any[],
	db: EntityTable<any, "id">,
): Promise<void> {
	db.bulkPut(data)
		.then(() => {
			console.log("Done adding data");
		})
		.catch((e) => {
			if (e.name === "BulkError") {
				console.error(
					`Some airports did not succeed. Completed: ${e.failures.length}`,
				);
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
