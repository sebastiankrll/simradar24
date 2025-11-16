import { FIRFeature, FIRFeatureCollection, SimAwareTraconFeature, SimAwareTraconFeatureCollection, StaticAirport } from "@sk/types/db";
import Dexie, { EntityTable } from "dexie";
import { Feature, FeatureCollection } from "geojson";

interface StaticVersions {
    airportsVersion: string;
    traconsVersion: string;
    firsVersion: string;
}

interface DexieItem {
    id: string;
}

const db = new Dexie('StaticDatabase') as Dexie & {
    airports: EntityTable<
        DexieItem,
        "id"
    >,
    firs: EntityTable<
        DexieItem,
        "id"
    >,
    tracons: EntityTable<
        DexieItem,
        "id"
    >
}

db.version(1).stores({
    airports: 'id',
    firs: 'id',
    tracons: 'id'
})

export async function initLocalDatabase(): Promise<void> {
    dxCheckForNewVersions()
}

async function dxCheckForNewVersions(): Promise<void> {
    const response = await fetch(`http://localhost:5000/api/static/versions`)
    const serverVersions: StaticVersions = await response.json()

    const localVersions: StaticVersions = JSON.parse(localStorage.getItem("databaseVersions") || "{}")

    if (serverVersions.airportsVersion !== localVersions.airportsVersion) {
        const airports = await fetchStaticData("airports") as StaticAirport[]
        storeAirports(airports)
    }

    if (serverVersions.firsVersion !== localVersions.firsVersion) {
        const collection = await fetchStaticData("firs") as FIRFeatureCollection
        const features = collection.features
            .filter(f => f.properties?.id && f.properties.id.trim() !== "")
            .map(f => ({
                id: f.properties.id,
                feature: f as FIRFeature
            }))

        storeFeatures(features, db.firs)
    }

    if (serverVersions.traconsVersion !== localVersions.traconsVersion) {
        const collection = await fetchStaticData("tracons") as SimAwareTraconFeatureCollection
        const features = collection.features
            .filter(f => f.properties?.id && f.properties.id.trim() !== "")
            .map(f => ({
                id: f.properties.id,
                feature: f as SimAwareTraconFeature
            }))

        storeFeatures(features, db.tracons)
    }

    // localStorage.setItem("databaseVersions", JSON.stringify(serverVersions))
}

async function fetchStaticData(type: string): Promise<StaticAirport[] | FeatureCollection> {
    const response = await fetch(`http://localhost:5000/api/static/${type}`)
    const data = await response.json()

    return data
}

async function storeAirports(airports: StaticAirport[]): Promise<void> {
    db.airports.bulkPut(airports).then(() => {
        console.log("Done adding airports")
    }).catch(e => {
        if (e.name === "BulkError") {
            console.error(`Some airports did not succeed. Completed: ${e.failures.length}`)
        } else {
            throw e
        }
    })
}

async function storeFeatures(
    features: { id: string; feature: FIRFeature | SimAwareTraconFeature; }[],
    db: EntityTable<DexieItem, "id">
): Promise<void> {
    db.bulkPut(features).then(() => {
        console.log("Done adding features")
    }).catch(e => {
        if (e.name === "BulkError") {
            console.error(`Some airports did not succeed. Completed: ${e.failures.length}`)
        } else {
            throw e
        }
    })
}