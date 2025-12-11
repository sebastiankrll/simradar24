import type { PilotDelta, WsAll } from "@sr24/types/vatsim";
import { Feature, type Map as OlMap } from "ol";
import type { Extent } from "ol/extent";
import { Point } from "ol/geom";
import { fromLonLat, transformExtent } from "ol/proj";
import RBush from "rbush";
import type { PilotProperties } from "@/types/ol";
import { pilotMainSource } from "./dataLayers";
import { animateOverlays, resetMap } from "./events";
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
const pilotMap = new Map<string, Feature<Point>>();

export function initPilotFeatures(data: WsAll): void {
	for (const p of data.pilots) {
		const props: PilotProperties = {
			type: "pilot",
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

		pilotMap.set(p.id, feature);
		pilotRBush.insert(newItem);
	}
}

export function updatePilotFeatures(delta: PilotDelta): void {
	const items: RBushPilotFeature[] = [];
	const pilotsInDelta = new Set<string>();

	for (const p of delta.updated) {
		pilotsInDelta.add(p.id);

		if (Object.keys(p).length === 1) continue;

		const feature = pilotMap.get(p.id);
		if (!feature) continue;

		const props = feature.getProperties() as PilotProperties;
		Object.assign(props, p);
		feature.setProperties(props);

		if (p.longitude !== undefined && p.latitude !== undefined) {
			const geom = feature.getGeometry();
			geom?.setCoordinates(fromLonLat([p.longitude, p.latitude]));
		}

		pilotMap.set(p.id, feature);

		const item: RBushPilotFeature = {
			minX: p.longitude ?? props.longitude,
			minY: p.latitude ?? props.latitude,
			maxX: p.longitude ?? props.longitude,
			maxY: p.latitude ?? props.latitude,
			feature,
		};
		items.push(item);
	}

	for (const p of delta.added) {
		pilotsInDelta.add(p.id);

		const props: PilotProperties = {
			type: "pilot",
			clicked: false,
			hovered: false,
			...p,
		};
		const feature = new Feature({
			geometry: new Point(fromLonLat([p.longitude, p.latitude])),
		});
		feature.setProperties(props);
		feature.setId(`pilot_${p.id}`);

		pilotMap.set(p.id, feature);

		const item: RBushPilotFeature = {
			minX: p.longitude,
			minY: p.latitude,
			maxX: p.longitude,
			maxY: p.latitude,
			feature,
		};
		items.push(item);
	}

	for (const id of pilotMap.keys()) {
		if (!pilotsInDelta.has(id)) {
			pilotMap.delete(id);
		}
	}

	if (highlightedPilot && !pilotMap.has(highlightedPilot)) {
		highlightedPilot = null;
		resetMap(true);
	}

	pilotRBush.clear();
	pilotRBush.load(items);
}

let highlightedPilot: string | null = null;

export function addHighlightedPilot(id: string | null): void {
	highlightedPilot = id;
}

export function clearHighlightedPilot(): void {
	highlightedPilot = null;
}

export function setPilotFeatures(extent: Extent): void {
	const [minX, minY, maxX, maxY] = transformExtent(extent, "EPSG:3857", "EPSG:4326");
	const pilotsByExtent = pilotRBush.search({ minX, minY, maxX, maxY });
	const pilotsByAltitude = pilotsByExtent.sort((a, b) => (b.feature.get("altitude_agl") || 0) - (a.feature.get("altitude_agl") || 0)).slice(0, 300);

	const features = pilotsByAltitude.map((f) => f.feature);

	if (highlightedPilot) {
		const exists = pilotsByAltitude.find((p) => p.feature.getId() === `pilot_${highlightedPilot}`);
		if (!exists) {
			const feature = pilotMap.get(highlightedPilot);
			if (feature) {
				features.push(feature);
			}
		}
	}

	pilotMainSource.clear();
	pilotMainSource.addFeatures(features);
}

export function moveToPilotFeature(id: string): Feature<Point> | null {
	let feature = pilotMainSource.getFeatureById(`pilot_${id}`) as Feature<Point> | null;
	if (!feature) {
		feature = pilotMap.get(id) || null;
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
let animating = false;

export function animatePilotFeatures(map: OlMap) {
	if (animating) return;
	animating = true;

	const resolution = map.getView().getResolution() || 0;
	let interval = 1000;
	if (resolution > 1) {
		interval = Math.max(resolution * 10, 50);
	}

	const now = Date.now();
	const elapsed = now - timestamp;

	if (elapsed > interval) {
		const features = pilotMainSource.getFeatures() as Feature<Point>[];

		features.forEach((feature) => {
			const groundspeed = (feature.get("groundspeed") as number) || 0;
			const heading = (feature.get("heading") as number) || 0;
			const latitude = (feature.get("latitude") as number) || 0;
			const longitude = (feature.get("longitude") as number) || 0;

			const distKm = (groundspeed * 0.514444 * elapsed) / 1000 / 1000;
			const headingRad = (heading * Math.PI) / 180;
			const dx = distKm * Math.sin(headingRad);
			const dy = distKm * Math.cos(headingRad);

			const newLat = latitude + (dy / 6378) * (180 / Math.PI);
			const newLon = longitude + ((dx / 6378) * (180 / Math.PI)) / Math.cos((latitude * Math.PI) / 180);

			feature.getGeometry()?.setCoordinates(fromLonLat([newLon, newLat]));

			feature.set("latitude", newLat, true);
			feature.set("longitude", newLon, true);
		});
		map.render();
		animateOverlays();
		animateTrackFeatures();

		timestamp = now;
	}

	animating = false;
}
