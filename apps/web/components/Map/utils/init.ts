import { Map as OlMap, View } from "ol";
import { fromLonLat, transformExtent } from "ol/proj";
import { initBaseLayer } from "./baseLayer";
import { initAirportFeatures, initDataLayers } from "./dataLayers";
import { initSunLayer } from "./sunLayer";

export function initMap(): OlMap {
	const savedView = localStorage.getItem("mapView");
	const initialCenter = [0, 0];
	const initialZoom = 2;

	let center = initialCenter;
	let zoom = initialZoom;

	if (savedView) {
		try {
			const parsed = JSON.parse(savedView) as {
				center: [number, number];
				zoom: number;
			};
			center = parsed.center;
			zoom = parsed.zoom;
		} catch {
			// fallback to default
		}
	}

	const baseLayer = initBaseLayer();
	const sunLayer = initSunLayer();
	const dataLayers = initDataLayers();

	const map = new OlMap({
		target: "map",
		layers: [baseLayer, sunLayer, ...dataLayers],
		view: new View({
			center: fromLonLat(center),
			zoom,
			maxZoom: 18,
			minZoom: 3,
			extent: transformExtent([-190, -80, 190, 80], "EPSG:4326", "EPSG:3857"),
		}),
		controls: [],
	});

	initAirportFeatures(map);

	return map;
}
