import { MapLibreLayer } from "@geoblocks/ol-maplibre-layer";
import type { StyleSpecification } from "maplibre-gl";
import styleDark from "../lib/positron_dark.json";
import styleLight from "../lib/positron_light.json";

const mbLayer = new MapLibreLayer({
	mapLibreOptions: {
		style: styleLight as StyleSpecification,
	},
	properties: { type: "base" },
});

export function initBaseLayer(): MapLibreLayer {
	return mbLayer;
}

export function setBaseLayerTheme(theme: boolean): void {
	const style = theme ? (styleDark as StyleSpecification) : (styleLight as StyleSpecification);
	mbLayer.mapLibreMap?.setStyle(style);
}
