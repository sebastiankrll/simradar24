import type { AirportShort, ControllerMerged, WsAll, WsDelta } from "@sk/types/vatsim";
import { initAirportFeatures, initControllerFeatures, initPilotFeatures, setFeatures, updateControllerFeatures, updatePilotFeatures } from "@/components/Map/utils/dataLayers";
import { dxInitDatabases } from "./dexie";
import { wsClient } from "@/utils/ws";
import { getMapView } from "@/components/Map/utils/init";

let airportsShort: AirportShort[] = [];
let controllersMerged: ControllerMerged[] = [];

export async function initData(): Promise<void> {
	await dxInitDatabases();
	const data = (await fetch("http://localhost:5000/api/data/init").then((res) => res.json())) as WsAll;
	await initAirportFeatures();
	initPilotFeatures(data.pilots);
	initControllerFeatures(data.controllers);
    console.log(data.controllers.filter(c => c.facility === "tracon"));

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
	// airportsShort = delta.airports;
	// controllersShort = wsShort.controllers;
	// tracons = await extractTracons(controllersShort);
	// updateOverlays();
}

export function getCachedAirport(id: string): AirportShort | null {
	return airportsShort.find((a) => a.icao === id) || null;
}

export function getCachedController(id: string): ControllerMerged | null {
	return controllersMerged.find((c) => c.id === id) || null;
}
