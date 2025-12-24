import { Map as OlMap, View } from "ol";
import { fromLonLat, transformExtent } from "ol/proj";
import { useFiltersStore } from "@/storage/zustand";
import { initBaseLayer, setBaseLayerTheme } from "./baseLayer";
import { initDataLayers, setDataLayersTheme } from "./dataLayers";
import { applyMapFilters } from "./filters";
import { initSunLayer, setSunLayerTheme } from "./sunLayer";

let map: OlMap | null = null;

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

	map = new OlMap({
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

	initFilters();

	return map;
}

function initFilters(): void {
	const state = useFiltersStore.getState();
	const activeInputs = Object.entries(state)
		.filter(([_key, value]) => Array.isArray(value) && value.length > 0)
		.map(([key]) => key);
	if (activeInputs.length === 0) return;

	const values: Record<string, any> = {};
	activeInputs.forEach((key) => {
		values[key] = state[key as keyof typeof state];
	});
	applyMapFilters(values);
}

export function getMapView(): View | null {
	return map?.getView() || null;
}

export function getMap(): OlMap | null {
	return map;
}

export function setMapTheme(theme: boolean): void {
	setBaseLayerTheme(theme);
	setDataLayersTheme(theme);
	setSunLayerTheme(theme);
}
