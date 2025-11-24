import type { FIRFeature, SimAwareTraconFeature } from "@sk/types/db";
import type { ControllerDelta, ControllerMerged, PilotDelta, PilotShort } from "@sk/types/vatsim";
import type { Extent } from "ol/extent";
import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import { Circle, type MultiPolygon, Point, type Polygon } from "ol/geom";
import { fromCircle } from "ol/geom/Polygon";
import VectorLayer from "ol/layer/Vector";
import WebGLVectorLayer from "ol/layer/WebGLVector";
import { fromLonLat, transformExtent } from "ol/proj";
import VectorSource from "ol/source/Vector";
import RBush from "rbush";
import { dxGetAirport, dxGetAllAirports, dxGetFirs, dxGetTracons } from "@/storage/dexie";
import type { AirportProperties, PilotProperties } from "@/types/ol";
import { webglConfig } from "../lib/webglConfig";

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
const firSource = new VectorSource({
	useSpatialIndex: false,
});
const traconSource = new VectorSource({
	useSpatialIndex: false,
});

export function initDataLayers(): (WebGLVectorLayer | VectorLayer)[] {
	const firLayer = new WebGLVectorLayer({
		source: firSource,
		style: webglConfig.fir,
		properties: {
			type: "fir",
		},
		zIndex: 1,
	});

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

	return [firLayer, traconLayer, trackLayer, pilotShadowLayer, pilotMainLayer, airportLabelLayer, airportMainLayer, airportTopLayer, firLabelLayer];
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

const cachedTracons: Map<string, Feature<MultiPolygon | Polygon>> = new Map();
const cachedFirs: Map<string, Feature<MultiPolygon>> = new Map();

export async function initControllerFeatures(controllers: ControllerMerged[]): Promise<void> {
	for (const c of controllers) {
		const id = c.id.replace(/^(tracon_|airport_|fir_)/, "");

		if (c.facility === "tracon") {
			const geojson = (await dxGetTracons([id]).then((res) => res[0]?.feature)) as SimAwareTraconFeature | undefined;
			if (geojson) {
				const feature = new GeoJSON().readFeature(geojson, {
					featureProjection: "EPSG:3857",
				}) as Feature<MultiPolygon>;

				feature.setProperties({ type: "tracon" });
				feature.setId(`controller_${id}`);

				traconSource.addFeature(feature);
				cachedTracons.set(id, feature);
			} else {
				const icao = id.split("_")[0];
				const airport = await dxGetAirport(icao);

				if (airport) {
					const polygon = createCircleTracon(airport.longitude, airport.latitude);
					const feature = new Feature(polygon);

					feature.setProperties({ type: "tracon" });
					feature.setId(`controller_${id}`);

					traconSource.addFeature(feature);
					cachedTracons.set(id, feature);
				}
			}
		}

		if (c.facility === "fir") {
			const geojson = (await dxGetFirs([id]).then((res) => res[0]?.feature)) as FIRFeature | undefined;
			if (geojson) {
				const feature = new GeoJSON().readFeature(geojson, {
					featureProjection: "EPSG:3857",
				}) as Feature<MultiPolygon>;

				feature.setProperties({ type: "fir" });
				feature.setId(`controller_${id}`);

				firSource.addFeature(feature);
				cachedFirs.set(id, feature);
			}
		}
	}
}

export async function updateControllerFeatures(delta: ControllerDelta): Promise<void> {
	for (const c of delta.updated) {
		const id = c.id.replace(/^(tracon_|airport_|fir_)/, "");

		if (c.facility === "tracon") {
			const feature = cachedTracons.get(id);
			if (feature) {
				feature.setProperties({ type: "tracon" });
			}
		}

		if (c.facility === "fir") {
			const feature = cachedFirs.get(id);
			if (feature) {
				feature.setProperties({ type: "fir" });
			}
		}
	}

	for (const c of delta.added) {
		const id = c.id.replace(/^(tracon_|airport_|fir_)/, "");

		if (c.facility === "tracon") {
			const geojson = (await dxGetTracons([id]).then((res) => res[0]?.feature)) as SimAwareTraconFeature | undefined;
			if (geojson) {
				const feature = new GeoJSON().readFeature(geojson, {
					featureProjection: "EPSG:3857",
				}) as Feature<MultiPolygon>;

				feature.setProperties({ type: "tracon" });
				feature.setId(`controller_${id}`);

				traconSource.addFeature(feature);
				cachedTracons.set(id, feature);
			}
		}

		if (c.facility === "fir") {
			const geojson = (await dxGetFirs([id]).then((res) => res[0]?.feature)) as FIRFeature | undefined;
			if (geojson) {
				const feature = new GeoJSON().readFeature(geojson, {
					featureProjection: "EPSG:3857",
				}) as Feature<MultiPolygon>;

				feature.setProperties({ type: "fir" });
				feature.setId(`controller_${id}`);

				firSource.addFeature(feature);
				cachedFirs.set(id, feature);
			}
		}
	}

	for (const c of delta.deleted) {
		const id = c.replace(/^(tracon_|airport_|fir_)/, "");

		const tracon = cachedTracons.get(id);
		if (tracon) {
			traconSource.removeFeature(tracon);
			cachedTracons.delete(id);
			continue;
		}

		const fir = cachedFirs.get(id);
		if (fir) {
			firSource.removeFeature(fir);
			cachedFirs.delete(id);
		}
	}
}

function createCircleTracon(lon: number, lat: number): Polygon {
	const radiusMeters = 25 * 1852;
	const center = fromLonLat([lon, lat]);
	const circle = new Circle(center, radiusMeters);
	const polygon = fromCircle(circle, 36);

	return polygon;
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

	const [minX, minY, maxX, maxY] = transformExtent(extent, "EPSG:3857", "EPSG:4326");
	const airportsByExtent = airportRBush.search({ minX, minY, maxX, maxY });
	const airportsBySize = airportsByExtent.filter((f) => visibleSizes.includes(f.size));

	airportMainSource.clear();
	airportMainSource.addFeatures(airportsBySize.map((f) => f.feature));
}

function getVisibleSizes(zoom: number): string[] {
	if (zoom > 8) return ["heliport", "small_airport", "medium_airport", "large_airport"];
	if (zoom > 7) return ["medium_airport", "large_airport"];
	if (zoom > 4.5) return ["large_airport"];
	return [];
}

function setPilotFeatures(extent: Extent): void {
	const [minX, minY, maxX, maxY] = transformExtent(extent, "EPSG:3857", "EPSG:4326");
	const pilotsByExtent = pilotRBush.search({ minX, minY, maxX, maxY });
	const pilotsByAltitude = pilotsByExtent.sort((a, b) => (b.feature.get("altitude_agl") || 0) - (a.feature.get("altitude_agl") || 0)).slice(0, 300);

	pilotMainSource.clear();
	pilotMainSource.addFeatures(pilotsByAltitude.map((f) => f.feature));
}
