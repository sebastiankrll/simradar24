import type { PilotDelta, PilotShort } from "@sk/types/vatsim";
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

export function initPilotFeatures(pilots: PilotShort[]): void {
	for (const p of pilots) {
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

	for (const p of delta.updated) {
		let feature = pilotMap.get(p.id);

		if (!feature) {
			feature = new Feature({
				geometry: new Point(fromLonLat([p.longitude, p.latitude])),
			});
		}

		const props: PilotProperties = {
			type: "pilot",
			clicked: feature.get("clicked") || false,
			hovered: feature.get("hovered") || false,
			...p,
		};
		feature.setProperties(props);

		const geom = feature.getGeometry();
		geom?.setCoordinates(fromLonLat([p.longitude, p.latitude]));

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

	for (const p of delta.added) {
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

	for (const p of delta.deleted) {
		const feature = pilotMainSource.getFeatureById(`pilot_${p}`);
		if (feature) {
			pilotMainSource.removeFeature(feature);
		}
		pilotMap.delete(p);
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
