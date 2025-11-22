import type { AirportShort, PilotShort, WsShort } from "@sk/types/vatsim";
import type { Extent } from "ol/extent";
import Feature from "ol/Feature";
import { Point } from "ol/geom";
import VectorLayer from "ol/layer/Vector";
import WebGLVectorLayer from "ol/layer/WebGLVector";
import { fromLonLat, transformExtent } from "ol/proj";
import VectorSource from "ol/source/Vector";
import RBush from "rbush";
import { dxGetAllAirports } from "@/storage/dexie";
import type { AirportProperties, PilotProperties } from "@/types/ol";
import { webglConfig } from "../lib/webglConfig";
import { updateOverlays } from "./events";

interface RBushPilotFeature {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
	feature: Feature<Point>;
}

interface RBushAirportFeature extends RBushPilotFeature {
	size: string;
}

const airportMainSource = new VectorSource({
	useSpatialIndex: false,
});
const pilotMainSource = new VectorSource({
	useSpatialIndex: false,
});

export function initDataLayers(): (WebGLVectorLayer | VectorLayer)[] {
	const firSource = new VectorSource();
	const firLayer = new WebGLVectorLayer({
		source: firSource,
		style: webglConfig.fir,
		properties: {
			type: "fir",
		},
		zIndex: 1,
	});

	const traconSource = new VectorSource();
	const traconLayer = new WebGLVectorLayer({
		source: traconSource,
		style: webglConfig.fir,
		properties: {
			type: "tracon",
		},
		zIndex: 2,
	});

	const trackSource = new VectorSource();
	const trackLayer = new VectorLayer({
		source: trackSource,
		properties: {
			type: "track",
		},
		zIndex: 3,
	});

	const pilotShadowLayer = new WebGLVectorLayer({
		source: pilotMainSource,
		style: webglConfig.pilot_shadow,
		properties: {
			type: "pilot_shadow",
		},
		zIndex: 4,
	});

	const pilotMainLayer = new WebGLVectorLayer({
		source: pilotMainSource,
		style: webglConfig.pilot_main,
		properties: {
			type: "pilot_main",
		},
		zIndex: 5,
	});
	// mapStorage.layerInit = new Date()

	const airportLabelSource = new VectorSource();
	const airportLabelLayer = new WebGLVectorLayer({
		source: airportLabelSource,
		style: webglConfig.airport_label,
		properties: {
			type: "airport_label",
		},
		zIndex: 6,
	});

	const airportMainLayer = new WebGLVectorLayer({
		source: airportMainSource,
		style: webglConfig.airport_main,
		properties: {
			type: "airport_main",
		},
		zIndex: 7,
	});

	const airportTopSource = new VectorSource();
	const airportTopLayer = new WebGLVectorLayer({
		source: airportTopSource,
		style: webglConfig.airport_top,
		properties: {
			type: "airport_top",
		},
		zIndex: 8,
	});

	const firLabelSource = new VectorSource();
	const firLabelLayer = new VectorLayer({
		source: firLabelSource,
		properties: {
			type: "fir_label",
		},
		zIndex: 9,
	});

	return [
		firLayer,
		traconLayer,
		trackLayer,
		pilotShadowLayer,
		pilotMainLayer,
		airportLabelLayer,
		airportMainLayer,
		airportTopLayer,
		firLabelLayer,
	];
}

let airportsShort: AirportShort[] = [];

export function getAirportShort(id: string): AirportShort | null {
	return airportsShort.find((a) => a.icao === id) || null;
}

export function updateDataLayers(wsShort: WsShort): void {
	updatePilotFeatures(wsShort.pilots);
	airportsShort = wsShort.airports;
	updateOverlays();
}

const airportRBush = new RBush<RBushAirportFeature>();

export async function initAirportFeatures(): Promise<void> {
	const airports = await dxGetAllAirports();

	const items: RBushAirportFeature[] = airports.map((a) => {
		const feature = new Feature({
			geometry: new Point(fromLonLat([a.longitude, a.latitude])),
		});
		const props: AirportProperties = {
			...a,
			clicked: false,
			hovered: false,
			type: "airport",
		};
		feature.setProperties(props);
		feature.setId(`airport_${a.id}`);

		return {
			minX: a.longitude,
			minY: a.latitude,
			maxX: a.longitude,
			maxY: a.latitude,
			size: a.size,
			feature: feature,
		};
	});
	airportRBush.load(items);
}

const pilotRBush = new RBush<RBushPilotFeature>();
const pilotFeaturesMap = new Map<string, RBushPilotFeature>();

function updatePilotFeatures(pilots: PilotShort[]): void {
	for (const p of pilots) {
		const item = pilotFeaturesMap.get(p.callsign);
		const props: PilotProperties = {
			type: "pilot",
			clicked: item?.feature.get("clicked") || false,
			hovered: item?.feature.get("hovered") || false,
			...p,
		};

		if (!item) {
			// New pilot --> insert as new feature
			const feature = new Feature({
				geometry: new Point(fromLonLat([p.longitude, p.latitude])),
			});
			feature.setProperties(props);
			feature.setId(`pilot_${p.callsign}`);

			const newItem: RBushPilotFeature = {
				minX: p.longitude,
				minY: p.latitude,
				maxX: p.longitude,
				maxY: p.latitude,
				feature,
			};

			pilotFeaturesMap.set(p.callsign, newItem);
			pilotRBush.insert(newItem);
			continue;
		}

		// Update
		const feature = item.feature;
		const geom = feature.getGeometry() as Point;
		geom.setCoordinates(fromLonLat([p.longitude, p.latitude]));
		feature.setProperties(props);

		pilotRBush.remove(item);
		item.minX = item.maxX = p.longitude;
		item.minY = item.maxY = p.latitude;
		pilotRBush.insert(item);
	}
}

export function setFeatures(extent: Extent, zoom: number): void {
	setAirportFeatures(extent, zoom);
	setPilotFeatures(extent);
}

function setAirportFeatures(extent: Extent, zoom: number): void {
	const visibleSizes = getVisibleSizes(zoom);
	if (visibleSizes.length === 0) {
		airportMainSource.clear();
		return;
	}

	const [minX, minY, maxX, maxY] = transformExtent(
		extent,
		"EPSG:3857",
		"EPSG:4326",
	);
	const airportsByExtent = airportRBush.search({ minX, minY, maxX, maxY });
	const airportsBySize = airportsByExtent.filter((f) =>
		visibleSizes.includes(f.size),
	);

	airportMainSource.clear();
	airportMainSource.addFeatures(airportsBySize.map((f) => f.feature));
}

function getVisibleSizes(zoom: number): string[] {
	if (zoom > 8)
		return ["heliport", "small_airport", "medium_airport", "large_airport"];
	if (zoom > 7) return ["medium_airport", "large_airport"];
	if (zoom > 4.5) return ["large_airport"];
	return [];
}

function setPilotFeatures(extent: Extent): void {
	const [minX, minY, maxX, maxY] = transformExtent(
		extent,
		"EPSG:3857",
		"EPSG:4326",
	);
	const pilotsByExtent = pilotRBush.search({ minX, minY, maxX, maxY });
	const pilotsByAltitude = pilotsByExtent
		.sort(
			(a, b) =>
				(b.feature.get("altitude_agl") || 0) -
				(a.feature.get("altitude_agl") || 0),
		)
		.slice(0, 300);

	pilotMainSource.clear();
	pilotMainSource.addFeatures(pilotsByAltitude.map((f) => f.feature));
}
