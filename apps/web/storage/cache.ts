import type { FIRFeature, SimAwareTraconFeature, StaticAirline, StaticAirport } from "@sr24/types/db";
import type { AirportShort, ControllerMerged, TrackPoint, WsAll, WsDelta } from "@sr24/types/vatsim";
import { initAirportFeatures } from "@/app/(map)/lib/airportFeatures";
import { initControllerFeatures, updateControllerFeatures } from "@/app/(map)/lib/controllerFeatures";
import { setFeatures } from "@/app/(map)/lib/dataLayers";
import { setClickedFeature, updateOverlays } from "@/app/(map)/lib/events";
import { getMapView } from "@/app/(map)/lib/init";
import { initPilotFeatures, updatePilotFeatures } from "@/app/(map)/lib/pilotFeatures";
import { updateTrackFeatures } from "@/app/(map)/lib/trackFeatures";
import type { StatusSetter } from "@/types/initializer";
import { fetchApi } from "@/utils/api";
import { wsClient } from "@/utils/ws";
import { dxGetAirline, dxGetAirport, dxGetFirs, dxGetTracons, dxInitDatabases } from "./dexie";

let airportsShort: Required<AirportShort>[] = [];
let controllersMerged: ControllerMerged[] = [];
let initialized = false;

export async function initCache(setStatus: StatusSetter, pathname: string): Promise<void> {
	if (initialized) {
		setClickedFeature(pathname);
		return;
	}

	// Init databases and fetch initial data simultaneously
	const dbInitPromise = dxInitDatabases(setStatus);
	const dataFetchPromise = fetchApi<WsAll>("/data/init");
	const [_, data] = await Promise.all([dbInitPromise, dataFetchPromise]);
	setStatus?.((prev) => ({ ...prev, cache: true }));

	await initAirportFeatures();
	await initControllerFeatures(data);
	initPilotFeatures(data);

	airportsShort = data.airports;
	controllersMerged = data.controllers;

	const view = getMapView();
	if (view) {
		setFeatures(view.calculateExtent(), view.getZoom() || 5);
	}
	setStatus?.((prev) => ({ ...prev, map: true }));

	const handleMessage = (delta: WsDelta) => {
		updateCache(delta);
	};
	wsClient.addListener(handleMessage);

	setClickedFeature(pathname);
	initialized = true;
}

export function cacheIsInitialized(): boolean {
	return initialized;
}

export async function updateCache(delta: WsDelta): Promise<void> {
	updatePilotFeatures(delta.pilots);
	updateControllerFeatures(delta.controllers);
	updateTrackFeatures(delta.pilots);

	airportsShort = [
		...delta.airports.added,
		...delta.airports.updated.map((a) => {
			const existing = airportsShort.find((ap) => ap.icao === a.icao);
			return { ...existing, ...(a as Required<AirportShort>) };
		}),
	];

	controllersMerged = [
		...delta.controllers.added,
		...delta.controllers.updated.map((c) => {
			const existing = controllersMerged.find((cm) => cm.id === c.id);
			const controllers = c.controllers.map((ctl) => {
				const existingCtl = existing?.controllers.find((e) => e.callsign === ctl.callsign);
				return { ...existingCtl, ...ctl };
			});

			return { ...c, controllers };
		}),
	];

	updateOverlays();
}

export function getAirportShort(id: string): Required<AirportShort> | null {
	return airportsShort.find((a) => a.icao === id) || null;
}

export function getControllerMerged(id: string): ControllerMerged | null {
	return controllersMerged.find((c) => c.id === id) || null;
}

const cachedAirports: Map<string, StaticAirport> = new Map();

export async function getCachedAirport(id: string): Promise<StaticAirport | null> {
	const cached = cachedAirports.get(id);
	if (cached) return cached;

	const airport = await dxGetAirport(id);
	if (airport) {
		cachedAirports.set(id, airport);
	}

	return airport || null;
}

const cachedAirlines: Map<string, StaticAirline> = new Map();

export async function getCachedAirline(id: string): Promise<StaticAirline | null> {
	const cached = cachedAirlines.get(id);
	if (cached) return cached;

	const airline = await dxGetAirline(id);
	if (airline) {
		cachedAirlines.set(id, airline);
	}

	return airline || null;
}

const cachedTracons: Map<string, SimAwareTraconFeature> = new Map();

export async function getCachedTracon(id: string): Promise<SimAwareTraconFeature | null> {
	const cached = cachedTracons.get(id);
	if (cached) return cached;

	const tracon = await dxGetTracons([id]).then((res) => res[0]);
	const feature = tracon?.feature as SimAwareTraconFeature;
	if (feature) {
		cachedTracons.set(id, feature);
	}

	return feature || null;
}

const cachedFirs: Map<string, FIRFeature> = new Map();

export async function getCachedFir(id: string): Promise<FIRFeature | null> {
	const cached = cachedFirs.get(id);
	if (cached) return cached;

	const fir = await dxGetFirs([id]).then((res) => res[0]);
	const feature = fir?.feature as FIRFeature;
	if (feature) {
		cachedFirs.set(id, feature);
	}

	return feature || null;
}

const cachedTrackPoints = new Map<string, TrackPoint[]>();
const pendingTrackPoints = new Map<string, Promise<TrackPoint[]>>();

export async function fetchTrackPoints(id: string): Promise<TrackPoint[]> {
	const cached = cachedTrackPoints.get(id);
	if (cached) {
		return cached;
	}

	const inFlight = pendingTrackPoints.get(id);
	if (inFlight) {
		return inFlight;
	}

	const promise = fetchApi<TrackPoint[]>(`/data/track/${id}`)
		.then((data) => {
			cachedTrackPoints.set(id, data);
			pendingTrackPoints.delete(id);
			return data;
		})
		.catch((err) => {
			pendingTrackPoints.delete(id);
			throw err;
		});

	pendingTrackPoints.set(id, promise);
	return promise;
}

export function clearCachedTrackPoints(): void {
	cachedTrackPoints.clear();
}

export function getControllersApiRequest(id: string, type: "airport" | "sector"): string | null {
	const airportIds = controllersMerged.filter((c) => c.id === `airport_${id}`).map((c) => c.controllers.map((ctl) => ctl.callsign));
	const traconIds = controllersMerged.filter((c) => c.id === `tracon_${id}`).map((c) => c.controllers.map((ctl) => ctl.callsign));
	const firIds = controllersMerged.filter((c) => c.id === `fir_${id}`).map((c) => c.controllers.map((ctl) => ctl.callsign));

	if (airportIds.length === 0 && type === "airport") {
		return null;
	}
	if (traconIds.length === 0 && firIds.length === 0 && type === "sector") {
		return null;
	}

	if (type === "airport") {
		return `/data/controllers/${airportIds.flat().join(",")}${traconIds.length > 0 ? "," : ""}${traconIds.flat().join(",")}`;
	}
	if (type === "sector" && firIds.length > 0) {
		return `/data/controllers/${firIds.flat().join(",")}`;
	} else {
		return `/data/controllers/${traconIds.flat().join(",")}`;
	}
}
