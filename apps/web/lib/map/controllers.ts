import type { FIRFeature, SimAwareTraconFeature } from "@sr24/types/db";
import type { ControllerMerged } from "@sr24/types/interface";
import { Feature } from "ol";
import GeoJSON from "ol/format/GeoJSON";
import { Circle, type MultiPolygon, Point, type Polygon } from "ol/geom";
import { fromCircle } from "ol/geom/Polygon";
import { fromLonLat } from "ol/proj";
import { getCachedAirport, getCachedFir, getCachedTracon } from "@/storage/cache";
import type { AirportLabelProperties, ControllerLabelProperties } from "@/types/ol";
import { getAirportSize } from "./airports";

export async function createTraconFeature(id: string): Promise<{ tracon?: Feature<MultiPolygon | Polygon>; label?: Feature<Point> }> {
	const cached = await getCachedTracon(id);
	if (cached) {
		const tracon = readGeoJSONFeature(cached, "tracon", id);

		const longitude = Number(cached.properties.label_lon);
		const latitude = Number(cached.properties.label_lat);
		const label = createLabelFeature(longitude, latitude, id, "tracon");

		return { tracon, label };
	}

	const airport = await getCachedAirport(id);
	if (airport) {
		const polygon = createCircleTracon(airport.longitude, airport.latitude);
		const tracon = new Feature(polygon);
		tracon.setProperties({ type: "tracon" });
		tracon.setId(`sector_${id}`);

		const longitude = airport.longitude;
		const latitude = airport.latitude - 17 / 60;
		const label = createLabelFeature(longitude, latitude, id, "tracon");

		return { tracon, label };
	}

	return {};
}

export async function createFirFeature(id: string): Promise<{ fir?: Feature<MultiPolygon>; label?: Feature<Point> }> {
	const firFeature = await getCachedFir(id);
	if (!firFeature) return {};

	const fir = readGeoJSONFeature(firFeature, "fir", id);

	const longitude = Number(firFeature.properties.label_lon);
	const latitude = Number(firFeature.properties.label_lat);
	const labelFeature = createLabelFeature(longitude, latitude, id, "fir");

	return { fir, label: labelFeature };
}

export async function createAirportFeature(controllerMerged: ControllerMerged, existingFeature?: Feature<Point>): Promise<Feature<Point> | null> {
	const offset = getStationsOffset(controllerMerged.controllers.map((c) => c.facility));
	if (existingFeature) {
		existingFeature.set("offset", offset);
		return existingFeature;
	}

	const id = stripPrefix(controllerMerged.id);
	const airport = await getCachedAirport(id);
	if (!airport) return null;

	const feature = new Feature({
		geometry: new Point(fromLonLat([airport.longitude, airport.latitude])),
	});
	const props: AirportLabelProperties = {
		type: "airport",
		size: getAirportSize(airport.size),
		offset: offset,
	};

	feature.setProperties(props);
	feature.setId(`sector_${id}`);

	return feature;
}

const geoJsonReader = new GeoJSON();

function readGeoJSONFeature(geojson: SimAwareTraconFeature | FIRFeature, type: "tracon" | "fir", id: string) {
	const feature = geoJsonReader.readFeature(geojson, {
		featureProjection: "EPSG:3857",
	}) as Feature<MultiPolygon>;

	feature.setProperties({ type });
	feature.setId(`sector_${id}`);
	return feature;
}

export function stripPrefix(id: string): string {
	const i = id.indexOf("_");
	return i === -1 ? id : id.slice(i + 1);
}

function createLabelFeature(lon: number, lat: number, label: string, type: "tracon" | "fir"): Feature<Point> {
	const labelFeature = new Feature({
		geometry: new Point(fromLonLat([lon, lat])),
	});
	const props: ControllerLabelProperties = {
		type: type,
		label: label,
		clicked: false,
		hovered: false,
	};

	labelFeature.setProperties(props);
	labelFeature.setId(`sector_${label}`);

	return labelFeature;
}

function createCircleTracon(lon: number, lat: number): Polygon {
	const radiusMeters = 25 * 1852;
	const center = fromLonLat([lon, lat]);
	const circle = new Circle(center, radiusMeters);
	const polygon = fromCircle(circle, 36);

	return polygon;
}

function getStationsOffset(facilities: number[]): number {
	const stations = [0, 0, 0, 0];
	facilities.forEach((f) => {
		if (f === -1) {
			stations[3] = 1;
		}
		if (f === 2) {
			stations[2] = 1;
		}
		if (f === 3) {
			stations[1] = 1;
		}
		if (f === 4) {
			stations[0] = 1;
		}
	});

	const mask = (stations[0] << 3) | (stations[1] << 2) | (stations[2] << 1) | stations[3];
	return (mask - 1) * 36;
}
