import type { Extent } from "ol/extent";
import VectorLayer from "ol/layer/Vector";
import WebGLVectorLayer from "ol/layer/WebGLVector";
import VectorSource from "ol/source/Vector";
import { webglConfig } from "../lib/webglConfig";
import { setAirportFeatures } from "./airportFeatures";
import { getControllerLabelStyle } from "./controllerFeatures";
import { setPilotFeatures } from "./pilotFeatures";

export const airportMainSource = new VectorSource({
	useSpatialIndex: false,
});
export const pilotMainSource = new VectorSource({
	useSpatialIndex: false,
});
export const firSource = new VectorSource({
	useSpatialIndex: false,
});
export const traconSource = new VectorSource({
	useSpatialIndex: false,
});
export const controllerLabelSource = new VectorSource({
	useSpatialIndex: false,
});
export const trackSource = new VectorSource({
	useSpatialIndex: false,
});
export const airportLabelSource = new VectorSource({
	useSpatialIndex: false,
});

export function initDataLayers(): (WebGLVectorLayer | VectorLayer)[] {
	const firLayer = new WebGLVectorLayer({
		source: firSource,
		style: webglConfig.controller,
		properties: {
			type: "fir",
		},
		zIndex: 1,
	});

	const traconLayer = new WebGLVectorLayer({
		source: traconSource,
		style: webglConfig.controller,
		properties: {
			type: "tracon",
		},
		zIndex: 2,
	});

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

	const controllerLabelLayer = new VectorLayer({
		source: controllerLabelSource,
		style: getControllerLabelStyle,
		properties: {
			type: "controller_label",
		},
		zIndex: 9,
	});

	return [firLayer, traconLayer, trackLayer, pilotShadowLayer, pilotMainLayer, airportLabelLayer, airportMainLayer, controllerLabelLayer];
}

export function setFeatures(extent: Extent, zoom: number): void {
	setAirportFeatures(extent, zoom);
	setPilotFeatures(extent);
}
