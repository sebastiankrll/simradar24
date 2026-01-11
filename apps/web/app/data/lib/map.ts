import type { PilotLong, TrackPoint } from "@sr24/types/interface";
import { Feature, Map as OlMap, View } from "ol";
import { LineString, Point } from "ol/geom";
import VectorLayer from "ol/layer/Vector";
import WebGLVectorLayer from "ol/layer/WebGLVector";
import { fromLonLat, transformExtent } from "ol/proj";
import VectorSource from "ol/source/Vector";
import Style from "ol/style/Style";
import { getAirportSize } from "@/components/Map/airportFeatures";
import { initBaseLayer, setBaseLayerTheme } from "@/components/Map/baseLayer";
import { initSunLayer, setSunLayerTheme } from "@/components/Map/sunLayer";
import { getStroke } from "@/components/Map/trackFeatures";
import { webglConfig } from "@/components/Map/webglConfig";
import { getCachedAirport } from "@/storage/cache";

const PADDING = [204, 116, 140, 436];

const airportSource = new VectorSource({
	useSpatialIndex: false,
});
const pilotSource = new VectorSource({
	useSpatialIndex: false,
});
const trackSource = new VectorSource({
	useSpatialIndex: false,
});

const trackLayer = new VectorLayer({
	source: trackSource,
	properties: {
		type: "track",
	},
	zIndex: 0,
});
const airportLayer = new WebGLVectorLayer({
	source: airportSource,
	variables: {
		size: 1,
	},
	style: webglConfig.airport_main,
	properties: {
		type: "airport_main",
	},
	zIndex: 1,
});
const pilotShadowLayer = new WebGLVectorLayer({
	source: pilotSource,
	variables: {
		theme: false,
		size: 1,
	},
	style: webglConfig.pilot_shadow,
	properties: {
		type: "pilot_shadow",
	},
	zIndex: 2,
});
const pilotMainLayer = new WebGLVectorLayer({
	source: pilotSource,
	variables: {
		theme: false,
		size: 1,
	},
	style: webglConfig.pilot_main,
	properties: {
		type: "pilot_main",
	},
	zIndex: 3,
});

let map: OlMap | null = null;

export function initMap(): OlMap {
	const baseLayer = initBaseLayer();
	const sunLayer = initSunLayer();

	map = new OlMap({
		target: "map",
		layers: [baseLayer, sunLayer, airportLayer, trackLayer, pilotShadowLayer, pilotMainLayer],
		view: new View({
			center: [0, 0],
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

export function initDataLayers(pilot: PilotLong, trackPoints: Required<TrackPoint>[]): void {
	airportSource.clear();
	pilotSource.clear();
	trackSource.clear();

	initAirports(pilot);
	initPilot(pilot, trackPoints);
	initTrackPoints(trackPoints);
}

let extent: [number, number, number, number] | null = null;

async function initAirports(pilot: PilotLong): Promise<void> {
	if (!pilot.flight_plan) return;

	const airports = (await Promise.all([getCachedAirport(pilot.flight_plan.departure.icao), getCachedAirport(pilot.flight_plan.arrival.icao)])).filter(
		(a) => a !== null,
	);
	const features: Feature<Point>[] = airports.map((a) => {
		const feature = new Feature({
			geometry: new Point(fromLonLat([a.longitude, a.latitude])),
		});
		feature.setProperties({
			size: getAirportSize(a.size),
			hovered: false,
			clicked: false,
			type: "airport",
		});
		feature.setId(`airport_${a.id}`);
		return feature;
	});
	airportSource.addFeatures(features);

	extent = airports.reduce(
		(ext, a) => {
			const airportExtent = [a.longitude, a.latitude, a.longitude, a.latitude];
			return [
				Math.min(ext[0], airportExtent[0]),
				Math.min(ext[1], airportExtent[1]),
				Math.max(ext[2], airportExtent[2]),
				Math.max(ext[3], airportExtent[3]),
			];
		},
		[180, 90, -180, -90],
	);

	map?.getView().fit(transformExtent(extent, "EPSG:4326", "EPSG:3857"), {
		padding: PADDING,
		duration: 1000,
	});
}

let pilotFeature: Feature<Point> | null = null;

function initPilot(pilot: PilotLong, trackPoints: Required<TrackPoint>[]): void {
	if (trackPoints.length === 0) return;
	pilotFeature = new Feature({
		geometry: new Point(trackPoints[0].coordinates),
	});
	pilotFeature.setProperties({
		type: "pilot",
		hovered: true,
		clicked: false,
		aircraft: pilot.aircraft,
		altitude_agl: trackPoints[0].altitude_agl,
		heading: trackPoints[0].heading,
	});
	pilotFeature.setId(`pilot_${pilot.id}`);

	pilotSource.addFeature(pilotFeature);
}

function initTrackPoints(trackPoints: Required<TrackPoint>[]): void {
	if (trackPoints.length < 2) return;
	const trackFeatures: Feature<LineString>[] = [];

	for (let i = 0; i < trackPoints.length - 1; i++) {
		const start = trackPoints[i];
		const end = trackPoints[i + 1];

		const trackFeature = new Feature({
			geometry: new LineString([start.coordinates, end.coordinates]),
			type: "track",
		});
		const stroke = getStroke(start, end);

		trackFeature.setStyle(
			new Style({
				stroke: stroke,
			}),
		);
		trackFeature.setId(`track_${i}`);
		trackFeatures.push(trackFeature);
	}

	trackSource.addFeatures(trackFeatures);
}

function setDataLayersTheme(theme: boolean): void {
	pilotMainLayer.updateStyleVariables({ theme });
	pilotShadowLayer.updateStyleVariables({ theme });
}

export function setDataLayersSettings(airportMarkerSize: number, planeMarkerSize: number): void {
	const airportSize = airportMarkerSize / 50;
	airportLayer.updateStyleVariables({ size: airportSize });

	const planeSize = planeMarkerSize / 50;
	pilotMainLayer.updateStyleVariables({ size: planeSize });
	pilotShadowLayer.updateStyleVariables({ size: planeSize });
}

export function updatePilot(trackPoint: Required<TrackPoint> | undefined): void {
	if (!pilotFeature || !trackPoint) return;

	pilotFeature.getGeometry()?.setCoordinates(trackPoint.coordinates);
	pilotFeature.setProperties({
		altitude_agl: trackPoint.altitude_agl,
		heading: trackPoint.heading,
	});
}

export function centerOnRoute(): void {
	if (!extent) return;
	map?.getView().fit(transformExtent(extent, "EPSG:4326", "EPSG:3857"), {
		padding: PADDING,
		duration: 300,
	});
}

export function centerOnPilot(): void {
	if (!pilotFeature) return;
	const geometry = pilotFeature.getGeometry();
	if (!geometry) return;

	const coordinates = geometry.getCoordinates();
	map?.getView().animate({
		center: coordinates,
		duration: 300,
		zoom: 10,
	});
}
