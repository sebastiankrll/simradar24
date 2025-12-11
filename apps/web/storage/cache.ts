import type { FIRFeature, SimAwareTraconFeature, StaticAirline, StaticAirport } from "@sr24/types/db";
import type { AirportShort, ControllerMerged, TrackPoint, WsAll, WsDelta } from "@sr24/types/vatsim";
import { initAirportFeatures } from "@/components/Map/utils/airportFeatures";
import { initControllerFeatures, updateControllerFeatures } from "@/components/Map/utils/controllerFeatures";
import { setFeatures } from "@/components/Map/utils/dataLayers";
import { setClickedFeature, updateOverlays } from "@/components/Map/utils/events";
import { getMapView } from "@/components/Map/utils/init";
import { initPilotFeatures, updatePilotFeatures } from "@/components/Map/utils/pilotFeatures";
import { updateTrackFeatures } from "@/components/Map/utils/trackFeatures";
import type { StatusMap } from "@/types/data";
import { fetchApi } from "@/utils/api";
import { wsClient } from "@/utils/ws";
import { dxGetAirline, dxGetAirport, dxGetFirs, dxGetTracons, dxInitDatabases } from "./dexie";

type StatusSetter = (status: Partial<StatusMap> | ((prev: Partial<StatusMap>) => Partial<StatusMap>)) => void;

let airportsShort: Required<AirportShort>[] = [];
let controllersMerged: ControllerMerged[] = [];
let initialized = false;

export async function initData(setStatus: StatusSetter, pathname: string): Promise<void> {
	if (initialized) {
		setClickedFeature(pathname);
		return;
	}

	await dxInitDatabases();
	setStatus?.((prev) => ({ ...prev, indexedDB: true }));

	const data = await fetchApi<WsAll>("/data/init");
	setStatus?.((prev) => ({ ...prev, initData: true }));

	await initAirportFeatures();
	initPilotFeatures(data);
	initControllerFeatures(data);

	airportsShort = data.airports;
	controllersMerged = data.controllers;

	const view = getMapView();
	if (view) {
		setFeatures(view.calculateExtent(), view.getZoom() || 5);
	}
	setStatus?.((prev) => ({ ...prev, initMap: true }));

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

let trackPointsCache: TrackPoint[] = [];
let trackPointsPending: Promise<TrackPoint[]> | null = null;

export async function fetchTrackPoints(id: string): Promise<TrackPoint[]> {
	if (trackPointsPending) {
		return trackPointsPending;
	}

	trackPointsPending = fetchApi<TrackPoint[]>(`/data/track/${id}`);
	trackPointsCache = await trackPointsPending;
	trackPointsPending = null;

	return trackPointsCache;
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
		return `/data/controllers/${airportIds.flat().join(",")},${traconIds.flat().join(",")}`;
	}
	if (type === "sector" && firIds.length > 0) {
		return `/data/controllers/${firIds.flat().join(",")}`;
	} else {
		return `/data/controllers/${traconIds.flat().join(",")}`;
	}
}
