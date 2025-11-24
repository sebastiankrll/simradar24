import type { StaticAirline, StaticAirport } from "@sk/types/db";
import type { AirportShort, ControllerMerged, WsAll, WsDelta } from "@sk/types/vatsim";
import {
	initAirportFeatures,
	initControllerFeatures,
	initPilotFeatures,
	setFeatures,
	updateControllerFeatures,
	updatePilotFeatures,
} from "@/components/Map/utils/dataLayers";
import { updateOverlays } from "@/components/Map/utils/events";
import { getMapView } from "@/components/Map/utils/init";
import { wsClient } from "@/utils/ws";
import { dxGetAirline, dxGetAirport, dxInitDatabases } from "./dexie";

let airportsShort: AirportShort[] = [];
let controllersMerged: ControllerMerged[] = [];
const cachedAirports: Map<string, StaticAirport> = new Map();
const cachedAirlines: Map<string, StaticAirline> = new Map();

export async function initData(): Promise<void> {
	await dxInitDatabases();
	const data = (await fetch("http://localhost:5000/api/data/init").then((res) => res.json())) as WsAll;
	await initAirportFeatures();
	initPilotFeatures(data.pilots);
	initControllerFeatures(data.controllers);

	airportsShort = data.airports;
	controllersMerged = data.controllers;

	const view = getMapView();
	if (view) {
		setFeatures(view.calculateExtent(), view.getZoom() || 5);
	}

	wsClient.addListener((msg) => {
		updateCache(msg);
	});
}

export async function updateCache(delta: WsDelta): Promise<void> {
	updatePilotFeatures(delta.pilots);
	updateControllerFeatures(delta.controllers);
	airportsShort = [...delta.airports.added, ...delta.airports.updated];
	controllersMerged = [...delta.controllers.added, ...delta.controllers.updated];
	updateOverlays();
}

export function getAirportShort(id: string): AirportShort | null {
	return airportsShort.find((a) => a.icao === id) || null;
}

export function getControllerShort(id: string): ControllerMerged | null {
	return controllersMerged.find((c) => c.id === id) || null;
}

export async function getCachedAirport(id: string): Promise<StaticAirport | null> {
	console.log(id);
	const cached = cachedAirports.get(id);
	if (cached) return cached;

	const airport = await dxGetAirport(id);
	if (airport) {
		cachedAirports.set(id, airport);
	}

	return airport || null;
}

export async function getCachedAirline(id: string): Promise<StaticAirline | null> {
	const cached = cachedAirlines.get(id);
	if (cached) return cached;

	const airline = await dxGetAirline(id);
	if (airline) {
		cachedAirlines.set(id, airline);
	}

	return airline || null;
}
