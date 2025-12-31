import type { PilotDelta, WsAll } from "@sr24/types/interface";
import { Feature, type Map as OlMap } from "ol";
import type { Extent } from "ol/extent";
import { Point } from "ol/geom";
import { fromLonLat, transformExtent } from "ol/proj";
import RBush from "rbush";
import { toast } from "react-toastify";
import MessageBox from "@/components/MessageBox/MessageBox";
import type { PilotProperties } from "@/types/ol";
import { pilotMainSource } from "./dataLayers";
import { animateOverlays, resetMap } from "./events";
import { filterPilotFeatures } from "./filters";
import { getMapView } from "./init";
import { animateTrackFeatures, initTrackFeatures } from "./trackFeatures";

interface RBushPilotFeature {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
	feature: Feature<Point>;
}

const pilotRBush = new RBush<RBushPilotFeature>();
const pilotMap = new Map<string, RBushPilotFeature>();

export function initPilotFeatures(data: WsAll): void {
	for (const p of data.pilots) {
		const props: PilotProperties = {
			type: "pilot",
			coord3857: fromLonLat([p.longitude, p.latitude]),
			clicked: false,
			hovered: false,
			...p,
		};

		const feature = new Feature({
			geometry: new Point(fromLonLat([p.longitude, p.latitude])),
		});
		feature.setProperties(props);
		feature.setId(`pilot_${p.id}`);

		const newItem: RBushPilotFeature = {
			minX: p.longitude,
			minY: p.latitude,
			maxX: p.longitude,
			maxY: p.latitude,
			feature,
		};

		pilotMap.set(p.id, newItem);
		pilotRBush.insert(newItem);
	}
}

export function updatePilotFeatures(delta: PilotDelta): void {
	const pilotsInDelta = new Set<string>();

	for (const p of delta.updated) {
		pilotsInDelta.add(p.id);

		if (Object.keys(p).length === 1) continue;

		const item = pilotMap.get(p.id);
		if (!item) continue;

		for (const k in p) {
			item.feature.set(k, p[k as keyof typeof p], true);
		}

		if (p.longitude !== undefined && p.latitude !== undefined) {
			const geom = item.feature.getGeometry();
			geom?.setCoordinates(fromLonLat([p.longitude, p.latitude]));

			item.feature.set("coord3857", fromLonLat([p.longitude, p.latitude]), true);

			pilotRBush.remove(item);
			item.minX = item.maxX = p.longitude;
			item.minY = item.maxY = p.latitude;
			pilotRBush.insert(item);
		}

		pilotMap.set(p.id, item);
	}

	for (const p of delta.added) {
		pilotsInDelta.add(p.id);

		const props: PilotProperties = {
			type: "pilot",
			coord3857: fromLonLat([p.longitude, p.latitude]),
			clicked: false,
			hovered: false,
			...p,
		};
		const feature = new Feature({
			geometry: new Point(fromLonLat([p.longitude, p.latitude])),
		});
		feature.setProperties(props);
		feature.setId(`pilot_${p.id}`);

		const newItem: RBushPilotFeature = {
			minX: p.longitude,
			minY: p.latitude,
			maxX: p.longitude,
			maxY: p.latitude,
			feature,
		};

		pilotMap.set(p.id, newItem);
		pilotRBush.insert(newItem);
	}

	const toRemove: string[] = [];

	for (const item of pilotMap) {
		if (pilotsInDelta.has(item[0])) continue;
		toRemove.push(item[0]);
		pilotRBush.remove(item[1]);
	}

	for (const id of toRemove) {
		pilotMap.delete(id);
	}

	if (highlightedPilot && !pilotMap.has(highlightedPilot)) {
		toast.info(MessageBox, { data: { title: "Pilot Disconnected", message: `The viewed pilot has disconnected.` } });
		highlightedPilot = null;
		resetMap(true);
	}
}

let highlightedPilot: string | null = null;

export function addHighlightedPilot(id: string | null): void {
	highlightedPilot = id;
}

export function clearHighlightedPilot(): void {
	highlightedPilot = null;
}

let initialized = false;
export function setPilotFeatures(extent: Extent, zoom: number): void {
	if (zoom > 12 && !initialized) {
		initialized = true;
		return;
	}

	const [minX, minY, maxX, maxY] = transformExtent(extent, "EPSG:3857", "EPSG:4326");
	const pilotsByExtent = pilotRBush.search({ minX, minY, maxX, maxY });
	const pilotsByAltitude = pilotsByExtent.sort((a, b) => (b.feature.get("altitude_agl") || 0) - (a.feature.get("altitude_agl") || 0));

	const features = pilotsByAltitude.map((f) => f.feature);
	const filteredFeatures = filterPilotFeatures(features).slice(0, 300);

	if (highlightedPilot) {
		const exists = pilotsByAltitude.find((p) => p.feature.getId() === `pilot_${highlightedPilot}`);
		if (!exists) {
			const item = pilotMap.get(highlightedPilot);
			if (item) {
				filteredFeatures.push(item.feature);
			}
		}
	}

	pilotMainSource.clear();
	pilotMainSource.addFeatures(filteredFeatures);
}

export function moveToPilotFeature(id: string): Feature<Point> | null {
	let feature = pilotMainSource.getFeatureById(`pilot_${id}`) as Feature<Point> | null;
	if (!feature) {
		const item = pilotMap.get(id);
		feature = item ? item.feature : null;
	}

	const view = getMapView();
	const geom = feature?.getGeometry();
	const coords = geom?.getCoordinates();
	if (!coords) return null;

	view?.animate({
		center: coords,
		duration: 200,
		zoom: 10,
	});

	initTrackFeatures(`pilot_${id}`);
	addHighlightedPilot(id);

	return feature;
}

let timestamp = Date.now();

export function animatePilotFeatures(map: OlMap) {
	const resolution = map.getView().getResolution() || 0;
	let interval = 1000;
	if (resolution > 1) {
		interval = Math.min(Math.max(resolution * 5, 40), 1000);
	}

	const now = Date.now();
	const elapsed = now - timestamp;

	if (elapsed > interval) {
		const features = pilotMainSource.getFeatures() as Feature<Point>[];

		features.forEach((feature) => {
			const kts = (feature.get("groundspeed") as number) || 0;
			if (kts <= 0) return;

			const heading = (feature.get("heading") as number) || 0;
			const headingRad = (heading * Math.PI) / 180;
			const meters = kts * 0.514444 * (elapsed / 1000);

			const [x, y] = feature.get("coord3857");
			const dx = meters * Math.sin(headingRad);
			const dy = meters * Math.cos(headingRad);
			const nx = x + dx;
			const ny = y + dy;

			feature.getGeometry()?.setCoordinates([nx, ny]);
			feature.set("coord3857", [nx, ny], true);
		});

		animateOverlays();
		animateTrackFeatures();

		timestamp = now;
	}
}
