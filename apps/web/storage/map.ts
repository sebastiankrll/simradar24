import type { AirportShort, ControllerMerged, InitialData, WsDelta } from "@sr24/types/interface";
import { initAirportFeatures } from "@/app/(map)/lib/airportFeatures";
import { initControllerFeatures, updateControllerFeatures } from "@/app/(map)/lib/controllerFeatures";
import { setFeatures } from "@/app/(map)/lib/dataLayers";
import { setClickedFeature, updateOverlays } from "@/app/(map)/lib/events";
import { getMapView } from "@/app/(map)/lib/init";
import { initPilotFeatures, updatePilotFeatures } from "@/app/(map)/lib/pilotFeatures";
import { updateTrackFeatures } from "@/app/(map)/lib/trackFeatures";
import { fetchApi } from "@/utils/api";
import { type WsData, type WsPresence, wsClient } from "@/utils/ws";

let airportsShort: Required<AirportShort>[] = [];
let controllersMerged: ControllerMerged[] = [];
let initialized = false;

export async function initMapData(pathname: string): Promise<void> {
	if (initialized) {
		setClickedFeature(pathname);
		return;
	}

	const data = await fetchApi<InitialData>("/map/init");

	await initAirportFeatures();
	await initControllerFeatures(data);
	initPilotFeatures(data);

	airportsShort = data.airports;
	controllersMerged = data.controllers;

	const view = getMapView();
	if (view) {
		setFeatures(view.calculateExtent(), view.getZoom() || 5);
	}

	const handleMessage = (msg: WsData | WsPresence) => {
		if (msg.t === "delta") {
			updateCache(msg.data);
		}
	};
	wsClient.addListener(handleMessage);

	setClickedFeature(pathname);
	initialized = true;
}

async function updateCache(delta: WsDelta): Promise<void> {
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
		return `/map/controller/${airportIds.flat().join(",")}${traconIds.length > 0 ? "," : ""}${traconIds.flat().join(",")}`;
	}
	if (type === "sector" && firIds.length > 0) {
		return `/map/controller/${firIds.flat().join(",")}`;
	} else {
		return `/map/controller/${traconIds.flat().join(",")}`;
	}
}
