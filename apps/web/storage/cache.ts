import type { FIRFeature, SimAwareTraconFeature, StaticAirline, StaticAirport } from "@sk/types/db";
import type { AirportShort, ControllerMerged, TrackPoint, WsAll, WsDelta } from "@sk/types/vatsim";
import { initAirportFeatures } from "@/components/Map/utils/airportFeatures";
import { initControllerFeatures, updateControllerFeatures } from "@/components/Map/utils/controllerFeatures";
import { setFeatures } from "@/components/Map/utils/dataLayers";
import { updateOverlays } from "@/components/Map/utils/events";
import { getMapView } from "@/components/Map/utils/init";
import { initPilotFeatures, updatePilotFeatures } from "@/components/Map/utils/pilotFeatures";
import { updateTrackFeatures } from "@/components/Map/utils/trackFeatures";
import type { StatusMap } from "@/types/data";
import { wsClient } from "@/utils/ws";
import { dxGetAirline, dxGetAirport, dxGetFirs, dxGetTracons, dxInitDatabases } from "./dexie";

type StatusSetter = (status: Partial<StatusMap> | ((prev: Partial<StatusMap>) => Partial<StatusMap>)) => void;

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

let airportsShort: AirportShort[] = [];
let controllersMerged: ControllerMerged[] = [];

export async function initData(setStatus?: StatusSetter): Promise<void> {
	await dxInitDatabases();
	setStatus?.((prev) => ({ ...prev, indexedDB: true }));

	const data = (await fetch(`${BASE_URL}/data/init`).then((res) => res.json())) as WsAll;
	setStatus?.((prev) => ({ ...prev, initData: true }));

	await initAirportFeatures();
	initPilotFeatures(data.pilots);
	initControllerFeatures(data.controllers);

	airportsShort = data.airports;
	controllersMerged = data.controllers;

	const view = getMapView();
	if (view) {
		setFeatures(view.calculateExtent(), view.getZoom() || 5);
	}
	setStatus?.((prev) => ({ ...prev, initMap: true }));

	wsClient.addListener((msg) => {
		updateCache(msg);
	});
}

export async function updateCache(delta: WsDelta): Promise<void> {
	updatePilotFeatures(delta.pilots);
	updateControllerFeatures(delta.controllers);
	updateTrackFeatures(delta.pilots);

	airportsShort = [...delta.airports.added, ...delta.airports.updated];
	controllersMerged = [...delta.controllers.added, ...delta.controllers.updated];

	updateOverlays();
}

export function getAirportShort(id: string): AirportShort | null {
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

	trackPointsPending = fetch(`${BASE_URL}/api/data/track/${id}`).then((res) => res.json());
	trackPointsCache = await trackPointsPending;
	trackPointsPending = null;

	return trackPointsCache;
}
