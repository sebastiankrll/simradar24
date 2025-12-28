import type { Extent } from "ol/extent";
import VectorLayer from "ol/layer/Vector";
import WebGLVectorLayer from "ol/layer/WebGLVector";
import VectorSource from "ol/source/Vector";
import type { RgbaColor } from "react-colorful";
import { setAirportFeatures } from "./airportFeatures";
import { getControllerLabelStyle } from "./controllerFeatures";
import { setPilotFeatures } from "./pilotFeatures";
import { webglConfig } from "./webglConfig";

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
		fill: "rgba(77, 95, 131, 0.1)",
		stroke: "rgba(77, 95, 131, 1)",
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
		fill: "rgba(222, 89, 234, 0.1)",
		stroke: "rgba(222, 89, 234, 1)",
	},
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
	variables: {
		theme: false,
		size: 1,
	},
	style: webglConfig.pilot_shadow,
	properties: {
		type: "pilot_shadow",
	},
	zIndex: 4,
});

const pilotMainLayer = new WebGLVectorLayer({
	source: pilotMainSource,
	variables: {
		theme: false,
		size: 1,
	},
	style: webglConfig.pilot_main,
	properties: {
		type: "pilot_main",
	},
	zIndex: 5,
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
	zIndex: 6,
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
	zIndex: 7,
});

const controllerLabelLayer = new VectorLayer({
	source: controllerLabelSource,
	style: getControllerLabelStyle,
	properties: {
		type: "sector_label",
	},
	zIndex: 8,
});

export function initDataLayers(): (WebGLVectorLayer | VectorLayer)[] {
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

export function setDataLayersSettings(
	airportMarkers: boolean,
	airportMarkerSize: number,
	planeMarkerSize: number,
	sectorAreas: boolean,
	traconColor: RgbaColor,
	firColor: RgbaColor,
): void {
	airportMainLayer.setVisible(airportMarkers);
	airportLabelLayer.setVisible(airportMarkers);

	const airportSize = airportMarkerSize / 50;
	airportMainLayer.updateStyleVariables({ size: airportSize });
	airportLabelLayer.updateStyleVariables({ size: airportSize });

	const planeSize = planeMarkerSize / 50;
	pilotMainLayer.updateStyleVariables({ size: planeSize });
	pilotShadowLayer.updateStyleVariables({ size: planeSize });

	firLayer.setVisible(sectorAreas);
	traconLayer.setVisible(sectorAreas);
	controllerLabelLayer.setVisible(sectorAreas);

	firLayer.updateStyleVariables({
		fill: `rgba(${firColor.r}, ${firColor.g}, ${firColor.b}, ${firColor.a})`,
		stroke: `rgba(${firColor.r}, ${firColor.g}, ${firColor.b}, 1)`,
	});
	traconLayer.updateStyleVariables({
		fill: `rgba(${traconColor.r}, ${traconColor.g}, ${traconColor.b}, ${traconColor.a})`,
		stroke: `rgba(${traconColor.r}, ${traconColor.g}, ${traconColor.b}, 1)`,
	});
}
