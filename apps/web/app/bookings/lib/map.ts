import type { Booking } from "@sr24/types/interface";
import { Feature, Map as OlMap, View } from "ol";
import { type MultiPolygon, Point, type Polygon } from "ol/geom";
import VectorLayer from "ol/layer/Vector";
import WebGLVectorLayer from "ol/layer/WebGLVector";
import { fromLonLat, transformExtent } from "ol/proj";
import VectorSource from "ol/source/Vector";
import type { RgbaColor } from "react-colorful";
import { getAirportSize } from "@/components/Map/airportFeatures";
import { initBaseLayer, setBaseLayerTheme } from "@/components/Map/baseLayer";
import {
	createCircleTracon,
	getAirportLabelStationsOffset,
	getControllerLabelFeature,
	getControllerLabelStyle,
	readGeoJSONFeature,
} from "@/components/Map/controllerFeatures";
import { initSunLayer, setSunLayerTheme } from "@/components/Map/sunLayer";
import { webglConfig } from "@/components/Map/webglConfig";
import { getCachedAirport, getCachedFir, getCachedTracon } from "@/storage/cache";
import { AirportLabelProperties } from "@/types/ol";

const airportMainSource = new VectorSource({
	useSpatialIndex: false,
});
const airportLabelSource = new VectorSource({
	useSpatialIndex: false,
});
const firSource = new VectorSource({
	useSpatialIndex: false,
});
const traconSource = new VectorSource({
	useSpatialIndex: false,
});
const controllerLabelSource = new VectorSource({
	useSpatialIndex: false,
});

const firLayer = new WebGLVectorLayer({
	source: firSource,
	variables: {
		fill: "rgba(77, 95, 131, 0.1)",
		stroke: "rgba(77, 95, 131, 1)",
	},
	style: webglConfig.controller,
	properties: {
		type: "fir",
	},
	zIndex: 0,
});
const traconLayer = new WebGLVectorLayer({
	source: traconSource,
	variables: {
		fill: "rgba(222, 89, 234, 0.1)",
		stroke: "rgba(222, 89, 234, 1)",
	},
	style: webglConfig.controller,
	properties: {
		type: "tracon",
	},
	zIndex: 1,
});
const airportLabelLayer = new WebGLVectorLayer({
	source: airportLabelSource,
	variables: {
		size: 1,
	},
	style: webglConfig.airport_label,
	properties: {
		type: "airport_label",
	},
	zIndex: 2,
});

const airportMainLayer = new WebGLVectorLayer({
	source: airportMainSource,
	variables: {
		size: 1,
	},
	style: webglConfig.airport_main,
	properties: {
		type: "airport_main",
	},
	zIndex: 3,
});

const controllerLabelLayer = new VectorLayer({
	source: controllerLabelSource,
	style: getControllerLabelStyle,
	properties: {
		type: "sector_label",
	},
	zIndex: 4,
});

let map: OlMap | null = null;

export function initMap(): OlMap {
	const baseLayer = initBaseLayer();
	const sunLayer = initSunLayer();

	map = new OlMap({
		target: "map",
		layers: [baseLayer, sunLayer, firLayer, traconLayer, airportLabelLayer, airportMainLayer, controllerLabelLayer],
		view: new View({
			center: [0, 4000000],
			zoom: 2,
			maxZoom: 18,
			minZoom: 3,
			extent: transformExtent([-190, -80, 190, 80], "EPSG:4326", "EPSG:3857"),
		}),
		controls: [],
	});

	return map;
}

export function setMapTheme(theme: boolean): void {
	setBaseLayerTheme(theme);
	setSunLayerTheme(theme);
	setDataLayersTheme(theme);
}

function setDataLayersTheme(theme: boolean): void {
	firLayer.updateStyleVariables({ theme });
	traconLayer.updateStyleVariables({ theme });
}

export function setDataLayersSettings(airportMarkerSize: number, traconColor: RgbaColor, firColor: RgbaColor): void {
	const airportSize = airportMarkerSize / 50;
	airportMainLayer.updateStyleVariables({ size: airportSize });
	airportLabelLayer.updateStyleVariables({ size: airportSize });

	firLayer.updateStyleVariables({
		fill: `rgba(${firColor.r}, ${firColor.g}, ${firColor.b}, ${firColor.a})`,
		stroke: `rgba(${firColor.r}, ${firColor.g}, ${firColor.b}, 1)`,
	});
	traconLayer.updateStyleVariables({
		fill: `rgba(${traconColor.r}, ${traconColor.g}, ${traconColor.b}, ${traconColor.a})`,
		stroke: `rgba(${traconColor.r}, ${traconColor.g}, ${traconColor.b}, 1)`,
	});
}

let cachedBookings: Booking[] = [];

export async function initDataLayers(bookings: Booking[]): Promise<void> {
	cachedBookings = bookings;

	const now = Date.now() - 4 * 60 * 60 * 1000;

	const currentBookings = bookings.filter(({ start, end }) => {
		const startTime = Date.parse(start);
		const endTime = Date.parse(end);

		return startTime <= now && now < endTime;
	});

	const traconFeatures: Feature<MultiPolygon | Polygon>[] = [];
	const firFeatures: Feature<MultiPolygon>[] = [];
	const controllerLabelFeatures: Feature<Point>[] = [];
	const airportLabelFeatures: Feature<Point>[] = [];
	const airportMainFeatures: Feature<Point>[] = [];

	const airportMap = new Map<string, Booking[]>();

	for (const booking of currentBookings) {
		const id = booking.id;

		if (booking.facility === 5) {
			const cached = await getCachedTracon(id);
			if (cached) {
				const feature = readGeoJSONFeature(cached, "tracon", id);
				traconFeatures.push(feature);

				const longitude = Number(cached.properties.label_lon);
				const latitude = Number(cached.properties.label_lat);
				const labelFeature = getControllerLabelFeature(longitude, latitude, id, "tracon");
				controllerLabelFeatures.push(labelFeature);

				continue;
			}

			const airport = await getCachedAirport(id);
			if (airport) {
				const polygon = createCircleTracon(airport.longitude, airport.latitude);
				const feature = new Feature(polygon);
				feature.setProperties({ type: "tracon" });
				feature.setId(`sector_${id}`);
				traconFeatures.push(feature);

				const longitude = airport.longitude;
				const latitude = airport.latitude - 17 / 60;
				const labelFeature = getControllerLabelFeature(longitude, latitude, id, "tracon");
				controllerLabelFeatures.push(labelFeature);
			}
		} else if (booking.facility === 6) {
			const firFeature = await getCachedFir(id);
			if (!firFeature) continue;

			const feature = readGeoJSONFeature(firFeature, "fir", id);
			firFeatures.push(feature);

			const longitude = Number(firFeature.properties.label_lon);
			const latitude = Number(firFeature.properties.label_lat);
			const labelFeature = getControllerLabelFeature(longitude, latitude, id, "fir");
			controllerLabelFeatures.push(labelFeature);
		} else {
			if (!airportMap.has(id)) {
				airportMap.set(id, []);
			}
			airportMap.get(id)?.push(booking);
		}
	}

	for (const [id, bookings] of airportMap.entries()) {
		const airport = await getCachedAirport(id);
		if (!airport) continue;

		const offset = getAirportLabelStationsOffset(bookings.map((c) => c.facility));
		const feature = new Feature({
			geometry: new Point(fromLonLat([airport.longitude, airport.latitude])),
		});
		const props = {
			type: "airport",
			clicked: false,
			hovered: false,
			size: getAirportSize(airport.size),
			offset: offset,
		};

		feature.setProperties(props);
		feature.setId(`sector_${id}`);

		airportMainFeatures.push(feature);
		airportLabelFeatures.push(feature);
	}

	airportMainSource.addFeatures(airportMainFeatures);
	traconSource.addFeatures(traconFeatures);
	firSource.addFeatures(firFeatures);
	controllerLabelSource.addFeatures(controllerLabelFeatures);
	airportLabelSource.addFeatures(airportLabelFeatures);
}
