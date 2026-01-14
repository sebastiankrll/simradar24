import type { FIRFeature, SimAwareTraconFeature } from "@sr24/types/db";
import Feature, { type FeatureLike } from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import { Circle, type MultiPolygon, Point, type Polygon } from "ol/geom";
import { fromCircle } from "ol/geom/Polygon";
import { fromLonLat } from "ol/proj";
import Fill from "ol/style/Fill";
import Style from "ol/style/Style";
import Text from "ol/style/Text";
import type { ControllerLabelProperties } from "@/types/ol";

const styleCache = new Map<string, Style>();

export function getControllerLabelStyle(feature: FeatureLike, resolution: number): Style | undefined {
	const type = feature.get("type") as "tracon" | "fir";

	if ((type === "tracon" && resolution > 3500) || (type === "fir" && resolution > 6000)) {
		return;
	}

	const active = (feature.get("clicked") as boolean) || (feature.get("hovered") as boolean);
	const label = feature.get("label") as string;

	const key = `${type}_${active}`;
	const cached = styleCache.get(key);
	if (cached) {
		cached.getText()?.setText(label);
		return cached;
	}

	const bg = type === "fir" ? new Fill({ color: "rgb(77, 95, 131)" }) : new Fill({ color: "rgb(222, 89, 234)" });
	const style = new Style({
		text: new Text({
			font: "400 11px Ubuntu, sans-serif",
			fill: new Fill({ color: "white" }),
			backgroundFill: active ? new Fill({ color: "rgb(234, 89, 121)" }) : bg,
			padding: [3, 2, 1, 4],
			textAlign: "center",
		}),
	});
	style.getText()?.setText(label);
	styleCache.set(key, style);

	return style;
}

const geoJsonReader = new GeoJSON();

export const readGeoJSONFeature = (geojson: SimAwareTraconFeature | FIRFeature, type: "tracon" | "fir", id: string) => {
	const feature = geoJsonReader.readFeature(geojson, {
		featureProjection: "EPSG:3857",
	}) as Feature<MultiPolygon>;

	feature.setProperties({ type });
	feature.setId(`sector_${id}`);
	return feature;
};

export function getControllerLabelFeature(lon: number, lat: number, label: string, type: "tracon" | "fir"): Feature<Point> {
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

export function createCircleTracon(lon: number, lat: number): Polygon {
	const radiusMeters = 25 * 1852;
	const center = fromLonLat([lon, lat]);
	const circle = new Circle(center, radiusMeters);
	const polygon = fromCircle(circle, 36);

	return polygon;
}

export function getAirportLabelStationsOffset(facilities: number[]): number {
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
