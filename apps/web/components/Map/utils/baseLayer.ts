import { MapLibreLayer } from "@geoblocks/ol-maplibre-layer";
import type { StyleSpecification } from "maplibre-gl";
import mapLibreStyle from "../lib/positron.json";

const mbLayer = new MapLibreLayer({
	mapLibreOptions: {
		style: mapLibreStyle as StyleSpecification,
	},
	properties: { type: "base" },
});

export function initBaseLayer(): MapLibreLayer {
	return mbLayer;
}
