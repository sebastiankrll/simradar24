import { type Feature, type Map as OlMap, Overlay, type View } from "ol";
import type { Point } from "ol/geom";
import type { Pixel } from "ol/pixel";
import { toLonLat } from "ol/proj";
import { createRoot, type Root } from "react-dom/client";
import { getCachedAirport } from "@/storage/cache";
import { dxGetAirline } from "@/storage/dexie";
import { AirportOverlay, PilotOverlay } from "../components/Overlay/Overlays";
import { setFeatures } from "./dataLayers";

export function onMoveEnd(evt: { map: OlMap }): void {
	const map = evt.map;
	const view: View = map.getView();
	const extent = view.calculateExtent();
	const center = toLonLat(view.getCenter() || [0, 0]);
	const zoom = view.getZoom() || 2;

	setFeatures(extent, zoom);
	localStorage.setItem("mapView", JSON.stringify({ center, zoom }));
}

let clickedFeature: Feature<Point> | null = null;
let hoveredFeature: Feature<Point> | null = null;
let clickedOverlay: Overlay | null = null;
let hoveredOverlay: Overlay | null = null;
let hovering = false;

export async function onPointerMove(evt: { pixel: Pixel; map: OlMap }): Promise<void> {
	if (hovering) return;
	hovering = true;

	const map = evt.map;
	const pixel = evt.pixel;

	const feature = map.forEachFeatureAtPixel(pixel, (f) => f, {
		layerFilter: (layer) => layer.get("type") === "airport_main" || layer.get("type") === "pilot_main",
		hitTolerance: 10,
	}) as Feature<Point> | undefined;

	map.getTargetElement().style.cursor = feature ? "pointer" : "";

	if (feature !== hoveredFeature && hoveredOverlay) {
		map.removeOverlay(hoveredOverlay);
		hoveredOverlay = null;
	}

	if (feature && feature !== hoveredFeature && feature !== clickedFeature) {
		hoveredOverlay = await createOverlay(feature);
		map.addOverlay(hoveredOverlay);
	}

	if (feature !== hoveredFeature) {
		hoveredFeature?.set("hovered", false);
		hoveredFeature = null;
	}

	feature?.set("hovered", true);
	hoveredFeature = feature || null;

	hovering = false;
}

export async function onClick(evt: { pixel: Pixel; map: OlMap }): Promise<void> {
	const map = evt.map;
	const pixel = evt.pixel;

	const feature = map.forEachFeatureAtPixel(pixel, (f) => f, {
		layerFilter: (layer) => layer.get("type") === "airport_main" || layer.get("type") === "pilot_main",
		hitTolerance: 10,
	}) as Feature<Point>;

	if (feature !== clickedFeature && clickedOverlay) {
		map.removeOverlay(clickedOverlay);
		clickedOverlay = null;
	}

	if (feature && feature !== clickedFeature) {
		clickedOverlay = await createOverlay(feature);
		map.addOverlay(clickedOverlay);
	}

	if (feature !== clickedFeature) {
		clickedFeature?.set("clicked", false);
		clickedFeature = null;
	}

	feature?.set("clicked", true);
	clickedFeature = feature || null;
}

async function createOverlay(feature: Feature<Point>): Promise<Overlay> {
	const element = document.createElement("div");
	const root = createRoot(element);
	const type = feature.get("type");

	let id: string | undefined;

	if (type === "pilot") {
		id = feature.get("callsign") as string;
		const icao = id.substring(0, 3);
		const airline = await dxGetAirline(icao);

		root.render(<PilotOverlay feature={feature} airline={airline} />);
	}

	if (type === "airport") {
		id = feature.get("id") as string;
		const airport = getCachedAirport(id);
		root.render(<AirportOverlay feature={feature} airport={airport} />);
	}

	const overlay = new Overlay({
		element,
		id: id,
		position: feature.getGeometry()?.getCoordinates(),
		positioning: "bottom-center",
		offset: [0, -25],
	});
	overlay.set("root", root);

	return overlay;
}

export function updateOverlays(): void {
	if (clickedFeature && clickedOverlay) {
		updateOverlay(clickedFeature, clickedOverlay);
	}
	if (hoveredFeature && hoveredOverlay) {
		updateOverlay(hoveredFeature, hoveredOverlay);
	}
}

async function updateOverlay(feature: Feature<Point>, overlay: Overlay): Promise<void> {
	if (!feature || !overlay) return;

	const geom = feature.getGeometry();
	const coords = geom?.getCoordinates();
	overlay.setPosition(coords);

	const root = overlay.get("root") as Root | undefined;
	const type = feature.get("type") as string | undefined;

	if (!root || !type) return;
	let id: string | undefined;

	if (type === "pilot") {
		id = feature.get("callsign") as string;
		const icao = id.substring(0, 3);
		const airline = await dxGetAirline(icao);

		root.render(<PilotOverlay feature={feature} airline={airline} />);
	}

	if (type === "airport") {
		id = feature.get("id") as string;
		const airport = getCachedAirport(id);
		root.render(<AirportOverlay feature={feature} airport={airport} />);
	}
}
