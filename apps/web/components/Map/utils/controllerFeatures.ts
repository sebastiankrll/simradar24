import type { FIRFeature, SimAwareTraconFeature } from "@sr24/types/db";
import type { ControllerDelta, ControllerMerged, WsAll } from "@sr24/types/vatsim";
import Feature, { type FeatureLike } from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import { Circle, type MultiPolygon, Point, type Polygon } from "ol/geom";
import { fromCircle } from "ol/geom/Polygon";
import { fromLonLat } from "ol/proj";
import Fill from "ol/style/Fill";
import Style from "ol/style/Style";
import Text from "ol/style/Text";
import { getCachedAirport, getCachedFir, getCachedTracon } from "@/storage/cache";
import type { AirportLabelProperties, ControllerLabelProperties } from "@/types/ol";
import { getAirportSize } from "./airportFeatures";
import { airportLabelSource, controllerLabelSource, firSource, traconSource } from "./dataLayers";
import { getMapView } from "./init";

export function getControllerLabelStyle(feature: FeatureLike, resolution: number): Style {
	const label = feature.get("label") as string;
	const type = feature.get("type") as "tracon" | "fir";
	const active = (feature.get("clicked") as boolean) || (feature.get("hovered") as boolean);
	const bg = type === "fir" ? new Fill({ color: "rgb(77, 95, 131)" }) : new Fill({ color: "rgb(222, 89, 234)" });

	if ((type === "tracon" && resolution > 3500) || (type === "fir" && resolution > 6000)) {
		return new Style({});
	}

	const style = new Style({
		text: new Text({
			text: label,
			font: "600 10px Manrope, sans-serif",
			fill: new Fill({ color: "white" }),
			backgroundFill: active ? new Fill({ color: "rgb(234, 89, 121)" }) : bg,
			padding: [3, 2, 1, 4],
			textAlign: "center",
		}),
	});

	return style;
}

const cachedTracons: Map<string, Feature<MultiPolygon | Polygon>> = new Map();
const cachedFirs: Map<string, Feature<MultiPolygon>> = new Map();
const controllerList: Set<string> = new Set();

const readGeoJSONFeature = (geojson: SimAwareTraconFeature | FIRFeature, type: "tracon" | "fir", id: string) => {
	const feature = new GeoJSON().readFeature(geojson, {
		featureProjection: "EPSG:3857",
	}) as Feature<MultiPolygon>;

	feature.setProperties({ type });
	feature.setId(`sector_${id}`);
	return feature;
};

export async function initControllerFeatures(data: WsAll): Promise<void> {
	for (const c of data.controllers) {
		const id = c.id.replace(/^(tracon_|airport_|fir_)/, "");
		controllerList.add(c.id);

		if (c.facility === "tracon") {
			const traconFeature = await getCachedTracon(id);

			if (traconFeature) {
				const feature = readGeoJSONFeature(traconFeature, "tracon", id);
				traconSource.addFeature(feature);
				cachedTracons.set(id, feature);

				const longitude = Number(traconFeature.properties.label_lon);
				const latitude = Number(traconFeature.properties.label_lat);
				const label = traconFeature.properties.id;
				createControllerLabel(longitude, latitude, label, "tracon");
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
				cachedTracons.set(id, feature);

				const longitude = airport.longitude;
				const latitude = airport.latitude - 25 / 60;
				const label = id;
				createControllerLabel(longitude, latitude, label, "tracon");
			}
		}

		if (c.facility === "fir") {
			const firFeature = await getCachedFir(id);
			if (!firFeature) continue;

			const feature = readGeoJSONFeature(firFeature, "fir", id);
			firSource.addFeature(feature);
			cachedFirs.set(id, feature);

			const longitude = Number(firFeature.properties.label_lon);
			const latitude = Number(firFeature.properties.label_lat);
			const label = firFeature.properties.id;
			createControllerLabel(longitude, latitude, label, "fir");
		}

		if (c.facility === "airport") {
			createAirportLabel(c);
		}
	}
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
		const id = c.id.replace(/^(tracon_|airport_|fir_)/, "");
		controllersInDelta.add(c.id);
		controllerList.add(c.id);

		if (c.facility === "tracon") {
			const traconFeature = await getCachedTracon(id);

			if (traconFeature) {
				const feature = readGeoJSONFeature(traconFeature, "tracon", id);
				traconSource.addFeature(feature);
				cachedTracons.set(id, feature);

				const longitude = Number(traconFeature.properties.label_lon);
				const latitude = Number(traconFeature.properties.label_lat);
				const label = traconFeature.properties.id;
				createControllerLabel(longitude, latitude, label, "tracon");
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
				cachedTracons.set(id, feature);
			}
		}

		if (c.facility === "fir") {
			const firFeature = await getCachedFir(id);
			if (!firFeature) continue;

			const feature = readGeoJSONFeature(firFeature, "fir", id);
			firSource.addFeature(feature);
			cachedFirs.set(id, feature);

			const longitude = Number(firFeature.properties.label_lon);
			const latitude = Number(firFeature.properties.label_lat);
			const label = firFeature.properties.id;
			createControllerLabel(longitude, latitude, label, "fir");
		}

		if (c.facility === "airport") {
			createAirportLabel(c);
		}
	}

	for (const id of controllerList) {
		if (!controllersInDelta.has(id)) {
			const shortId = id.replace(/^(tracon_|airport_|fir_)/, "");
			controllerList.delete(id);

			const labelFeature = controllerLabelSource.getFeatureById(`sector_${shortId}`);
			if (labelFeature) {
				controllerLabelSource.removeFeature(labelFeature);
			}

			const tracon = cachedTracons.get(shortId);
			if (tracon) {
				traconSource.removeFeature(tracon);
				cachedTracons.delete(shortId);
				continue;
			}

			const fir = cachedFirs.get(shortId);
			if (fir) {
				firSource.removeFeature(fir);
				cachedFirs.delete(shortId);
				continue;
			}

			if (id.startsWith("airport_")) {
				const airportLabel = airportLabelSource.getFeatureById(`sector_${shortId}`);
				if (airportLabel) {
					airportLabelSource.removeFeature(airportLabel);
				}
			}
		}
	}
}

function createControllerLabel(lon: number, lat: number, label: string, type: "tracon" | "fir"): void {
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
	controllerLabelSource.addFeature(labelFeature);
}

function createCircleTracon(lon: number, lat: number): Polygon {
	const radiusMeters = 25 * 1852;
	const center = fromLonLat([lon, lat]);
	const circle = new Circle(center, radiusMeters);
	const polygon = fromCircle(circle, 36);

	return polygon;
}

async function createAirportLabel(controllerMerged: ControllerMerged): Promise<void> {
	const id = controllerMerged.id.replace(/^(tracon_|airport_|fir_)/, "");
	const airport = await getCachedAirport(id);
	if (!airport) return;

	const stations = getAirportLabelStations(controllerMerged);

	const labelFeature = new Feature({
		geometry: new Point(fromLonLat([airport.longitude, airport.latitude])),
	});
	const props: AirportLabelProperties = {
		type: "airport",
		size: getAirportSize(airport.size),
		offset: parseInt(stations.join(""), 2) * 36,
	};

	labelFeature.setProperties(props);
	labelFeature.setId(`sector_${id}`);
	airportLabelSource.addFeature(labelFeature);
}

function updateAirportLabel(controllerMerged: ControllerMerged): void {
	const id = controllerMerged.id.replace(/^(tracon_|airport_|fir_)/, "");
	const labelFeature = airportLabelSource.getFeatureById(`sector_${id}`);
	if (!labelFeature) return;

	const stations = getAirportLabelStations(controllerMerged);
	labelFeature.set("offset", parseInt(stations.join(""), 2) * 36);
}

function getAirportLabelStations(controllerMerged: ControllerMerged): number[] {
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

	return stations;
}

export function moveToSectorFeature(id: string): Feature<Point> | null {
	console.log(controllerLabelSource.getFeatures());
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

	return labelFeature;
}
