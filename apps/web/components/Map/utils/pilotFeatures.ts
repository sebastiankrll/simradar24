import type { PilotDelta, WsAll } from "@sr24/types/vatsim";
import { Feature } from "ol";
import type { Extent } from "ol/extent";
import { Point } from "ol/geom";
import { fromLonLat, transformExtent } from "ol/proj";
import RBush from "rbush";
import type { PilotProperties } from "@/types/ol";
import { pilotMainSource } from "./dataLayers";
import { getMapView } from "./init";
import { initTrackFeatures } from "./trackFeatures";

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
		zoom: 8,
	});

	initTrackFeatures(`pilot_${id}`);
	addHighlightedPilot(id);

	return feature;
}
