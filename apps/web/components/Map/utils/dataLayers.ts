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

const firLayer = new WebGLVectorLayer({
	source: firSource,
	variables: {
		theme: false,
	},
	style: webglConfig.controller,
	properties: {
		type: "fir",
	},
	zIndex: 1,
});

const traconLayer = new WebGLVectorLayer({
	source: traconSource,
	variables: {
		theme: false,
	},
	style: webglConfig.controller,
	properties: {
		type: "tracon",
	},
	zIndex: 2,
});

const pilotMainLayer = new WebGLVectorLayer({
	source: pilotMainSource,
	variables: {
		theme: false,
	},
	style: webglConfig.pilot_main,
	properties: {
		type: "pilot_main",
	},
	zIndex: 5,
});

const pilotShadowLayer = new WebGLVectorLayer({
	source: pilotMainSource,
	variables: {
		theme: false,
	},
	style: webglConfig.pilot_shadow,
	properties: {
		type: "pilot_shadow",
	},
	zIndex: 4,
});

export function initDataLayers(): (WebGLVectorLayer | VectorLayer)[] {
	const trackLayer = new VectorLayer({
		source: trackSource,
		properties: {
			type: "track",
		},
		zIndex: 3,
	});

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
			type: "sector_label",
		},
		zIndex: 9,
	});

	return [firLayer, traconLayer, trackLayer, pilotShadowLayer, pilotMainLayer, airportLabelLayer, airportMainLayer, controllerLabelLayer];
}

export function setFeatures(extent: Extent, zoom: number): void {
	setAirportFeatures(extent, zoom);
	setPilotFeatures(extent, zoom);
}

export function setDataLayersTheme(theme: boolean): void {
	pilotMainLayer.updateStyleVariables({ theme });
	pilotShadowLayer.updateStyleVariables({ theme });
	firLayer.updateStyleVariables({ theme });
	traconLayer.updateStyleVariables({ theme });
}
