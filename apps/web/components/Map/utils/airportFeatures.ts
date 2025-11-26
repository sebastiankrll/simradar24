import { Feature } from "ol";
import type { Extent } from "ol/extent";
import { Point } from "ol/geom";
import { fromLonLat, transformExtent } from "ol/proj";
import RBush from "rbush";
import { dxGetAllAirports } from "@/storage/dexie";
import type { AirportProperties } from "@/types/ol";
import { airportMainSource } from "./dataLayers";

interface RBushAirportFeature {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
	feature: Feature<Point>;
	size: string;
}

const airportRBush = new RBush<RBushAirportFeature>();

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

export function getAirportSize(size: string): "s" | "m" | "l" {
	switch (size) {
		case "small_airport":
		case "heliport":
			return "s";
		case "medium_airport":
			return "m";
		case "large_airport":
			return "l";
		default:
			return "s";
	}
}

export function setAirportFeatures(extent: Extent, zoom: number): void {
	const visibleSizes = getVisibleSizes(zoom);
	if (visibleSizes.length === 0) {
		airportMainSource.clear();
		return;
	}

	const [minX, minY, maxX, maxY] = transformExtent(extent, "EPSG:3857", "EPSG:4326");
	const airportsByExtent = airportRBush.search({ minX, minY, maxX, maxY });
	const airportsBySize = airportsByExtent.filter((f) => visibleSizes.includes(f.size));

	airportMainSource.clear();
	airportMainSource.addFeatures(airportsBySize.map((f) => f.feature));
}

function getVisibleSizes(zoom: number): string[] {
	if (zoom > 7.5) return ["heliport", "small_airport", "medium_airport", "large_airport"];
	if (zoom > 6.5) return ["medium_airport", "large_airport"];
	if (zoom > 4.5) return ["large_airport"];
	return [];
}
