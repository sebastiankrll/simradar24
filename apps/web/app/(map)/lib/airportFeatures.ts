import { Feature } from "ol";
import type { Extent } from "ol/extent";
import { Point } from "ol/geom";
import { fromLonLat, transformExtent } from "ol/proj";
import RBush from "rbush";
import { getAirportSize } from "@/components/Map/airportFeatures";
import { dxGetAllAirports } from "@/storage/dexie";
import type { AirportProperties } from "@/types/ol";
import { airportMainSource, toggleLayerVisibility } from "./dataLayers";
import { getMapView, MAP_PADDING } from "./init";

interface RBushAirportFeature {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
	size: string;
	feature: Feature<Point>;
}

const airportRBush = new RBush<RBushAirportFeature>();
const airportMap = new Map<string, Feature<Point>>();

export async function initAirportFeatures(): Promise<void> {
	const airports = await dxGetAllAirports();

	const items: RBushAirportFeature[] = airports.map((a) => {
		const feature = new Feature({
			geometry: new Point(fromLonLat([a.longitude, a.latitude])),
		});
		const props: AirportProperties = {
			clicked: false,
			hovered: false,
			size: getAirportSize(a.size),
			type: "airport",
		};
		feature.setProperties(props);
		feature.setId(`airport_${a.id}`);

		airportMap.set(a.id, feature);

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

const highlightedAirports: Set<string> = new Set();

export function addHighlightedAirport(airportId: string): void {
	highlightedAirports.add(airportId);
}

export function clearHighlightedAirport(): void {
	highlightedAirports.clear();
}

export function setAirportFeatures(extent: Extent, zoom: number): void {
	const visibleSizes = getVisibleSizes(zoom);
	if (visibleSizes.length === 0) {
		airportMainSource.clear();

		highlightedAirports.forEach((id) => {
			const feature = airportMap.get(id);
			if (feature) {
				airportMainSource.addFeature(feature);
			}
		});

		return;
	}

	const [minX, minY, maxX, maxY] = transformExtent(extent, "EPSG:3857", "EPSG:4326");
	const airportsByExtent = airportRBush.search({ minX, minY, maxX, maxY });
	const airportsBySize = airportsByExtent.filter((f) => visibleSizes.includes(f.size));

	airportMainSource.clear();
	if (!eventAirportsActive) {
		airportMainSource.addFeatures(airportsBySize.map((f) => f.feature));
	}

	if (highlightedAirports.size > 0) {
		highlightedAirports.forEach((id) => {
			const exists = airportsBySize.find((a) => a.feature.getId() === `airport_${id}`);
			if (!exists || eventAirportsActive) {
				const feature = airportMap.get(id);
				if (feature) {
					airportMainSource.addFeature(feature);
				}
			}
		});
	}
}

function getVisibleSizes(zoom: number): string[] {
	if (zoom > 7.5) return ["heliport", "small_airport", "medium_airport", "large_airport"];
	if (zoom > 6.5) return ["medium_airport", "large_airport"];
	if (zoom > 4.5) return ["large_airport"];
	return [];
}

export function moveToAirportFeature(id: string): Feature<Point> | null {
	let feature = airportMainSource.getFeatureById(`airport_${id}`) as Feature<Point> | undefined;
	if (!feature) {
		feature = airportMap.get(id);
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

	addHighlightedAirport(id);

	return feature || null;
}

let eventAirportsActive = false;

export function showEventAirports(ids: string[]): void {
	const view = getMapView();
	if (!view) return;

	highlightedAirports.forEach((id) => {
		const feature = airportMap.get(id);
		if (feature) {
			feature.set("clicked", false);
		}
	});
	highlightedAirports.clear();

	const features: Feature<Point>[] = [];
	ids.forEach((id) => {
		const feature = airportMap.get(id);
		if (feature) {
			features.push(feature);
			feature.set("clicked", true);
			highlightedAirports.add(id);
		}
	});

	if (features.length === 0) return;

	const extent = features[0].getGeometry()?.getExtent();
	if (!extent) return;

	features.forEach((feature) => {
		const geom = feature.getGeometry();
		if (geom) {
			const featExtent = geom.getExtent();
			extent[0] = Math.min(extent[0], featExtent[0]);
			extent[1] = Math.min(extent[1], featExtent[1]);
			extent[2] = Math.max(extent[2], featExtent[2]);
			extent[3] = Math.max(extent[3], featExtent[3]);
		}
	});

	eventAirportsActive = true;
	airportMainSource.clear();
	airportMainSource.addFeatures(features);

	toggleLayerVisibility(["pilot", "controllers"], false);

	view?.fit(extent, {
		duration: 200,
		maxZoom: 12,
		padding: MAP_PADDING,
	});
}

export function hideEventAirports(): void {
	eventAirportsActive = false;
	highlightedAirports.forEach((id) => {
		const feature = airportMap.get(id);
		if (feature) {
			feature.set("clicked", false);
		}
	});
	highlightedAirports.clear();
	toggleLayerVisibility(["pilot", "controllers"], true);

	const view = getMapView();
	if (!view) return;
	setAirportFeatures(view.calculateExtent(), view.getZoom() || 0);
}
