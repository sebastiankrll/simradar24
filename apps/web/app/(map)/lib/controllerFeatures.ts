import type { FIRFeature, SimAwareTraconFeature } from "@sr24/types/db";
import type { ControllerDelta, ControllerMerged, WsAll } from "@sr24/types/interface";
import Feature, { type FeatureLike } from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import { Circle, type MultiPolygon, Point, type Polygon } from "ol/geom";
import { fromCircle } from "ol/geom/Polygon";
import { fromLonLat } from "ol/proj";
import Fill from "ol/style/Fill";
import Style from "ol/style/Style";
import Text from "ol/style/Text";
import { toast } from "react-toastify";
import MessageBox from "@/components/MessageBox/MessageBox";
import { getCachedAirport, getCachedFir, getCachedTracon } from "@/storage/cache";
import type { AirportLabelProperties, ControllerLabelProperties } from "@/types/ol";
import { getAirportSize } from "./airportFeatures";
import { airportLabelSource, controllerLabelSource, firSource, traconSource } from "./dataLayers";
import { resetMap } from "./events";
import { getMapView } from "./init";

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
const controllerSet = new Set<string>();

const readGeoJSONFeature = (geojson: SimAwareTraconFeature | FIRFeature, type: "tracon" | "fir", id: string) => {
	const feature = geoJsonReader.readFeature(geojson, {
		featureProjection: "EPSG:3857",
	}) as Feature<MultiPolygon>;

	feature.setProperties({ type });
	feature.setId(`sector_${id}`);
	return feature;
};

export async function initControllerFeatures(data: WsAll): Promise<void> {
	const traconFeatures: Feature<MultiPolygon | Polygon>[] = [];
	const firFeatures: Feature<MultiPolygon>[] = [];
	const controllerLabelFeatures: Feature<Point>[] = [];
	const airportLabelFeatures: Feature<Point>[] = [];

	await Promise.all(
		data.controllers.map(async (c) => {
			const id = stripPrefix(c.id);
			controllerSet.add(c.id);

			if (c.facility === "tracon") {
				const cached = await getCachedTracon(id);

				if (cached) {
					const feature = readGeoJSONFeature(cached, "tracon", id);
					traconFeatures.push(feature);

					const longitude = Number(cached.properties.label_lon);
					const latitude = Number(cached.properties.label_lat);
					const labelFeature = getControllerLabelFeature(longitude, latitude, id, "tracon");
					controllerLabelFeatures.push(labelFeature);

					return;
				}

				const icao = id.split("_")[0];
				const airport = await getCachedAirport(icao);
				if (airport) {
					const polygon = createCircleTracon(airport.longitude, airport.latitude);
					const feature = new Feature(polygon);
					feature.setProperties({ type: "tracon" });
					feature.setId(`sector_${id}`);
					traconFeatures.push(feature);

					const longitude = airport.longitude;
					const latitude = airport.latitude - 25 / 60;
					const labelFeature = getControllerLabelFeature(longitude, latitude, id, "tracon");
					controllerLabelFeatures.push(labelFeature);
				}

				return;
			}

			if (c.facility === "fir") {
				const firFeature = await getCachedFir(id);
				if (!firFeature) return;

				const feature = readGeoJSONFeature(firFeature, "fir", id);
				firFeatures.push(feature);

				const longitude = Number(firFeature.properties.label_lon);
				const latitude = Number(firFeature.properties.label_lat);
				const labelFeature = getControllerLabelFeature(longitude, latitude, id, "fir");
				controllerLabelFeatures.push(labelFeature);

				return;
			}

			if (c.facility === "airport") {
				const labelFeature = await getAirportLabelFeature(c);
				if (labelFeature) {
					airportLabelFeatures.push(labelFeature);
				}
			}
		}),
	);

	traconSource.addFeatures(traconFeatures);
	firSource.addFeatures(firFeatures);
	controllerLabelSource.addFeatures(controllerLabelFeatures);
	airportLabelSource.addFeatures(airportLabelFeatures);
}

export async function updateControllerFeatures(delta: ControllerDelta): Promise<void> {
	const controllersInDelta = new Set<string>();

	for (const c of delta.updated) {
		if (c.facility === "airport") {
			updateAirportLabel(c);
		}
		controllersInDelta.add(c.id);
	}

	for (const c of delta.added) {
		const id = stripPrefix(c.id);
		controllersInDelta.add(c.id);
		controllerSet.add(c.id);

		if (c.facility === "tracon") {
			const traconFeature = await getCachedTracon(id);

			if (traconFeature) {
				const feature = readGeoJSONFeature(traconFeature, "tracon", id);
				traconSource.addFeature(feature);

				const longitude = Number(traconFeature.properties.label_lon);
				const latitude = Number(traconFeature.properties.label_lat);
				const labelFeature = getControllerLabelFeature(longitude, latitude, id, "tracon");
				controllerLabelSource.addFeature(labelFeature);

				continue;
			}

			const icao = id.split("_")[0];
			const airport = await getCachedAirport(icao);
			if (airport) {
				const polygon = createCircleTracon(airport.longitude, airport.latitude);
				const feature = new Feature(polygon);
				feature.setProperties({ type: "tracon" });
				feature.setId(`sector_${id}`);
				traconSource.addFeature(feature);

				const longitude = airport.longitude;
				const latitude = airport.latitude - 25 / 60;
				const labelFeature = getControllerLabelFeature(longitude, latitude, id, "tracon");
				controllerLabelSource.addFeature(labelFeature);

				continue;
			}
		}

		if (c.facility === "fir") {
			const firFeature = await getCachedFir(id);
			if (!firFeature) continue;

			const feature = readGeoJSONFeature(firFeature, "fir", id);
			firSource.addFeature(feature);

			const longitude = Number(firFeature.properties.label_lon);
			const latitude = Number(firFeature.properties.label_lat);
			const labelFeature = getControllerLabelFeature(longitude, latitude, id, "fir");
			controllerLabelSource.addFeature(labelFeature);

			continue;
		}

		if (c.facility === "airport") {
			const labelFeature = await getAirportLabelFeature(c);
			if (labelFeature) {
				airportLabelSource.addFeature(labelFeature);
			}
		}
	}

	const toRemove: string[] = [];

	for (const id of controllerSet) {
		if (controllersInDelta.has(id)) continue;

		toRemove.push(id);
		const shortId = stripPrefix(id);

		if (id.startsWith("tracon_") || id.startsWith("fir_")) {
			const feature = controllerLabelSource.getFeatureById(`sector_${shortId}`);
			feature && controllerLabelSource.removeFeature(feature);
		}

		if (id.startsWith("tracon_")) {
			const feature = traconSource.getFeatureById(`sector_${shortId}`);
			feature && traconSource.removeFeature(feature);
			continue;
		}

		if (id.startsWith("fir_")) {
			const feature = firSource.getFeatureById(`sector_${shortId}`);
			feature && firSource.removeFeature(feature);
			continue;
		}

		if (id.startsWith("airport_")) {
			const feature = airportLabelSource.getFeatureById(`sector_${shortId}`);
			feature && airportLabelSource.removeFeature(feature);
		}
	}

	for (const id of toRemove) {
		controllerSet.delete(id);
	}

	if (highlightedController && !controllerSet.has(`tracon_${highlightedController}`) && !controllerSet.has(`fir_${highlightedController}`)) {
		toast.info(MessageBox, { data: { title: "Controller Disconnected", message: `The viewed controller has disconnected.` } });
		highlightedController = null;
		resetMap(true);
	}
}

function getControllerLabelFeature(lon: number, lat: number, label: string, type: "tracon" | "fir"): Feature<Point> {
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

async function getAirportLabelFeature(controllerMerged: ControllerMerged): Promise<Feature<Point> | null> {
	const id = stripPrefix(controllerMerged.id);
	const airport = await getCachedAirport(id);
	if (!airport) return null;

	const offset = getAirportLabelStationsOffset(controllerMerged);
	const labelFeature = new Feature({
		geometry: new Point(fromLonLat([airport.longitude, airport.latitude])),
	});
	const props: AirportLabelProperties = {
		type: "airport",
		size: getAirportSize(airport.size),
		offset: offset,
	};

	labelFeature.setProperties(props);
	labelFeature.setId(`sector_${id}`);

	return labelFeature;
}

function updateAirportLabel(controllerMerged: ControllerMerged): void {
	const id = stripPrefix(controllerMerged.id);
	const labelFeature = airportLabelSource.getFeatureById(`sector_${id}`);
	if (!labelFeature) return;

	const offset = getAirportLabelStationsOffset(controllerMerged);
	labelFeature.set("offset", offset);
}

function getAirportLabelStationsOffset(controllerMerged: ControllerMerged): number {
	const stations = [0, 0, 0, 0];
	controllerMerged.controllers.forEach((c) => {
		if (c.facility === -1) {
			stations[3] = 1;
		}
		if (c.facility === 2) {
			stations[2] = 1;
		}
		if (c.facility === 3) {
			stations[1] = 1;
		}
		if (c.facility === 4) {
			stations[0] = 1;
		}
	});

	const mask = (stations[0] << 3) | (stations[1] << 2) | (stations[2] << 1) | stations[3];
	return (mask - 1) * 36;
}

export function moveToSectorFeature(id: string): Feature<Point> | null {
	const labelFeature = controllerLabelSource.getFeatureById(`sector_${id}`) as Feature<Point> | null;

	const view = getMapView();
	const geom = labelFeature?.getGeometry();
	const coords = geom?.getCoordinates();
	if (!coords) return null;

	view?.animate({
		center: coords,
		duration: 200,
		zoom: 7,
	});

	addHighlightedController(id);

	return labelFeature;
}

let highlightedController: string | null = null;

export function addHighlightedController(id: string | null): void {
	highlightedController = id;
}

export function clearHighlightedController(): void {
	highlightedController = null;
}

function stripPrefix(id: string): string {
	const i = id.indexOf("_");
	return i === -1 ? id : id.slice(i + 1);
}
