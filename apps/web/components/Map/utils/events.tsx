import type { StaticAirport } from "@sr24/types/db";
import { type Feature, type MapBrowserEvent, Overlay, type View } from "ol";
import type BaseEvent from "ol/events/Event";
import { boundingExtent, type Extent } from "ol/extent";
import type { Point } from "ol/geom";
import { fromLonLat, toLonLat } from "ol/proj";
import { createRoot, type Root } from "react-dom/client";
import { getAirportShort, getCachedAirline, getCachedAirport, getCachedFir, getCachedTracon, getControllerMerged } from "@/storage/cache";
import { AirportOverlay, PilotOverlay, SectorOverlay } from "../components/Overlay/Overlays";
import { addHighlightedAirport, clearHighlightedAirport, moveToAirportFeature } from "./airportFeatures";
import { firSource, pilotMainSource, setFeatures, trackSource, traconSource } from "./dataLayers";
import { getMap, getMapView } from "./init";
import { addHighlightedPilot, clearHighlightedPilot, moveToPilotFeature } from "./pilotFeatures";
import { initTrackFeatures } from "./trackFeatures";

export type NavigateFn = (href: string) => void;
let navigate: NavigateFn | null = null;
export function setNavigator(fn: NavigateFn) {
	navigate = fn;
}

export function onMoveEnd(evt: BaseEvent | Event): void {
	const map = evt.target;
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

export async function onPointerMove(evt: MapBrowserEvent): Promise<void> {
	if (hovering) return;
	hovering = true;

	const map = evt.map;
	const pixel = evt.pixel;

	if (!(evt.originalEvent.target instanceof HTMLCanvasElement) && clickedFeature) {
		map.getTargetElement().style.cursor = "";
		hovering = false;

		if (hoveredOverlay) {
			map.removeOverlay(hoveredOverlay);
			hoveredOverlay = null;
			hoveredFeature?.set("hovered", false);
			hoveredFeature = null;
		}
		return;
	}

	const feature = map.forEachFeatureAtPixel(pixel, (f) => f, {
		layerFilter: (layer) => layer.get("type") === "airport_main" || layer.get("type") === "pilot_main" || layer.get("type") === "sector_label",
		hitTolerance: 10,
	}) as Feature<Point> | undefined;

	map.getTargetElement().style.cursor = feature ? "pointer" : "";

	if (feature !== hoveredFeature && hoveredOverlay) {
		map.removeOverlay(hoveredOverlay);
		hoveredOverlay = null;
	}

	if (feature && feature !== hoveredFeature && feature !== clickedFeature) {
		hoveredOverlay = await createOverlay(feature);
		map?.addOverlay(hoveredOverlay);
	}

	if (feature !== hoveredFeature) {
		toggleControllerSectorHover(hoveredFeature, false, "hovered");
		hoveredFeature?.set("hovered", false);
		hoveredFeature = null;
	}

	toggleControllerSectorHover(feature, true, "hovered");

	feature?.set("hovered", true);
	hoveredFeature = feature || null;

	hovering = false;
}

export async function onClick(evt: MapBrowserEvent): Promise<void> {
	const map = evt.map;
	const pixel = evt.pixel;

	const feature = map.forEachFeatureAtPixel(pixel, (f) => f, {
		layerFilter: (layer) => layer.get("type") === "airport_main" || layer.get("type") === "pilot_main" || layer.get("type") === "sector_label",
		hitTolerance: 10,
	}) as Feature<Point> | undefined;

	if (feature !== clickedFeature && clickedOverlay) {
		map.removeOverlay(clickedOverlay);
		clickedOverlay = null;
		clearMap();
	}

	if (feature && feature !== clickedFeature) {
		clickedOverlay = await createOverlay(feature);
		map?.addOverlay(clickedOverlay);

		hoveredOverlay && map.removeOverlay(hoveredOverlay);
		hoveredOverlay = null;
	}

	if (feature !== clickedFeature) {
		clickedFeature?.set("clicked", false);
		clickedFeature = null;
	}

	if (!feature) {
		navigate?.(`/`);
		return;
	}

	feature?.set("clicked", true);
	clickedFeature = feature || null;

	toggleControllerSectorHover(feature, true, "clicked");

	if (!clickedFeature) return;

	const type = clickedFeature.get("type") as string | undefined;
	const id = clickedFeature.getId()?.toString() || null;
	if (type === "pilot" && id) {
		initTrackFeatures(id);

		const strippedId = id.toString().replace(/^pilot_/, "");
		navigate?.(`/pilot/${strippedId}`);
		addHighlightedPilot(strippedId);
	}

	if (type === "airport" && id) {
		const strippedId = id.toString().replace(/^airport_/, "");
		navigate?.(`/airport/${strippedId}`);
		addHighlightedAirport(strippedId);
	}

	if ((type === "tracon" || type === "fir") && id) {
		const strippedId = id.toString().replace(/^(sector)_/, "");
		navigate?.(`/sector/${strippedId}`);
	}
}

async function createOverlay(feature: Feature<Point>): Promise<Overlay> {
	const element = document.createElement("div");
	const root = createRoot(element);
	const type = feature.get("type");

	let id: string | undefined;

	if (type === "pilot") {
		id = feature.get("callsign") as string;

		const icao = id.substring(0, 3);
		const airline = await getCachedAirline(icao);

		root.render(<PilotOverlay feature={feature} airline={airline} />);
	}

	if (type === "airport") {
		id =
			feature
				.getId()
				?.toString()
				.replace(/^airport_/, "") || "";

		const cachedAirport = await getCachedAirport(id);
		const shortAirport = getAirportShort(id);
		const controllerMerged = getControllerMerged(`airport_${id}`);
		root.render(<AirportOverlay cached={cachedAirport} short={shortAirport} merged={controllerMerged} />);
	}

	if (type === "tracon") {
		id =
			feature
				.getId()
				?.toString()
				.replace(/^sector_/, "") || "";

		const cachedTracon = await getCachedTracon(id);
		const controllerMerged = getControllerMerged(`tracon_${id}`);
		root.render(<SectorOverlay cached={cachedTracon} merged={controllerMerged} />);
	}

	if (type === "fir") {
		id =
			feature
				.getId()
				?.toString()
				.replace(/^sector_/, "") || "";

		const cachedFir = await getCachedFir(id);
		const controllerMerged = getControllerMerged(`fir_${id}`);
		root.render(<SectorOverlay cached={cachedFir} merged={controllerMerged} />);
	}

	const overlay = new Overlay({
		element,
		id: id,
		position: feature.getGeometry()?.getCoordinates(),
		positioning: "bottom-center",
		offset: [0, -25],
		insertFirst: false,
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
	if (!feature || !overlay) {
		resetMap(true);
		return;
	}

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
		const airline = await getCachedAirline(icao);

		root.render(<PilotOverlay feature={feature} airline={airline} />);
	}

	if (type === "airport") {
		id =
			feature
				.getId()
				?.toString()
				.replace(/^airport_/, "") || "";

		const cachedAirport = await getCachedAirport(id);
		const shortAirport = getAirportShort(id);
		const controllerMerged = getControllerMerged(`airport_${id}`);
		root.render(<AirportOverlay cached={cachedAirport} short={shortAirport} merged={controllerMerged} />);
	}

	if (type === "tracon") {
		id =
			feature
				.getId()
				?.toString()
				.replace(/^sector_/, "") || "";

		const cachedTracon = await getCachedTracon(id);
		const controllerMerged = getControllerMerged(`tracon_${id}`);
		root.render(<SectorOverlay cached={cachedTracon} merged={controllerMerged} />);
	}

	if (type === "fir") {
		id =
			feature
				.getId()
				?.toString()
				.replace(/^sector_/, "") || "";

		const cachedFir = await getCachedFir(id);
		const controllerMerged = getControllerMerged(`fir_${id}`);
		root.render(<SectorOverlay cached={cachedFir} merged={controllerMerged} />);
	}
}

function toggleControllerSectorHover(feature: Feature<Point> | undefined | null, hovered: boolean, event: "hovered" | "clicked"): void {
	if (feature?.get("type") === "tracon") {
		const id = feature.getId()?.toString();
		if (id) {
			const multiFeature = traconSource.getFeatureById(id);
			if (multiFeature) {
				multiFeature.set(event, hovered);
			}
		}
	}

	if (feature?.get("type") === "fir") {
		const id = feature.getId()?.toString();
		if (id) {
			const multiFeature = firSource.getFeatureById(id);
			if (multiFeature) {
				multiFeature.set(event, hovered);
			}
		}
	}
}

let lastExtent: Extent | null = null;

export function showRouteOnMap(departure: StaticAirport | null, arrival: StaticAirport | null, toggle: "route" | "follow" | null): void {
	clearHighlightedAirport();
	if (!departure || !arrival || toggle === "follow") return;

	const view = getMapView();
	if (!toggle && lastExtent) {
		view?.fit(lastExtent, {
			duration: 200,
		});
		lastExtent = null;
		return;
	}

	const coords = [fromLonLat([departure.longitude, departure.latitude]), fromLonLat([arrival.longitude, arrival.latitude])];
	const extent = boundingExtent(coords);

	addHighlightedAirport(departure.id);
	addHighlightedAirport(arrival.id);

	lastExtent = view?.calculateExtent() || null;
	view?.fit(extent, {
		duration: 200,
		padding: [150, 100, 100, 468],
	});
}

let followInterval: NodeJS.Timeout | null = null;

export function followPilotOnMap(id: string, toggle: "route" | "follow" | null): void {
	if (followInterval) {
		clearInterval(followInterval);
		followInterval = null;
	}
	if (toggle === "route") return;

	const view = getMapView();
	if (!toggle && lastExtent) {
		view?.fit(lastExtent, {
			duration: 200,
		});
		lastExtent = null;
		return;
	}

	const follow = () => {
		const feature = pilotMainSource.getFeatureById(`pilot_${id}`) as Feature<Point> | undefined;
		const geom = feature?.getGeometry();
		if (!geom) return;

		const coords = geom.getCoordinates();
		if (coords) {
			view?.animate({
				center: coords,
				duration: 200,
			});
		}
	};

	lastExtent = view?.calculateExtent() || null;

	follow();
	followInterval = setInterval(follow, 5000);
}

function clearMap(): void {
	trackSource.clear();
	toggleControllerSectorHover(clickedFeature, false, "clicked");
	clearHighlightedAirport();
	clearHighlightedPilot();
	if (followInterval) {
		clearInterval(followInterval);
		followInterval = null;
	}
}

export function resetMap(nav: boolean = true): void {
	if (lastExtent) {
		const view = getMapView();
		view?.fit(lastExtent, {
			duration: 200,
		});
		lastExtent = null;
	}

	const map = getMap();
	if (clickedOverlay) {
		map?.removeOverlay(clickedOverlay);
		clickedOverlay = null;
	}
	clickedFeature?.set("clicked", false);
	clickedFeature = null;

	clearMap();

	if (nav) {
		navigate?.(`/`);
	}
}

export async function setHoveredPilot(id: string | null): Promise<void> {
	const map = getMap();

	if (!id && hoveredFeature) {
		hoveredFeature.set("hovered", false);
		hoveredFeature = null;

		hoveredOverlay && map?.removeOverlay(hoveredOverlay);
		hoveredOverlay = null;
		return;
	}

	const feature = pilotMainSource.getFeatureById(`pilot_${id}`) as Feature<Point> | undefined;
	if (feature) {
		feature.set("hovered", true);
		hoveredFeature = feature;

		hoveredOverlay = await createOverlay(feature);
		map?.addOverlay(hoveredOverlay);
	}
}

export function setClickedFeature(path: string): void {
	const type = path.split("/")[1];
	const id = path.split("/")[2];

	if (clickedFeature?.getId() === `${type}_${id}`) {
		return;
	}

	resetMap(false);

	if (type === "pilot") {
		clickedFeature = moveToPilotFeature(id);
	}
	if (type === "airport") {
		clickedFeature = moveToAirportFeature(id);
	}

	if (clickedFeature) {
		const map = getMap();
		clickedFeature.set("clicked", true);

		createOverlay(clickedFeature).then((overlay) => {
			clickedOverlay = overlay;
			map?.addOverlay(overlay);
		});
	}
}
