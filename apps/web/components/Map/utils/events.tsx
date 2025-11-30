import { type Feature, type MapBrowserEvent, Overlay, type View } from "ol";
import type BaseEvent from "ol/events/Event";
import type { Point } from "ol/geom";
import { fromLonLat, toLonLat } from "ol/proj";
import { createRoot, type Root } from "react-dom/client";
import { getAirportShort, getCachedAirline, getCachedAirport, getCachedFir, getCachedTracon, getControllerMerged } from "@/storage/cache";
import { AirportOverlay, PilotOverlay, SectorOverlay } from "../components/Overlay/Overlays";
import { firSource, pilotMainSource, setFeatures, trackSource, traconSource } from "./dataLayers";
import { initTrackFeatures } from "./trackFeatures";
import { StaticAirport } from "@sk/types/db";
import { boundingExtent, Extent } from "ol/extent";
import { getMapView } from "./init";

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

	if (!(evt.originalEvent.target instanceof HTMLCanvasElement)) {
		map.getTargetElement().style.cursor = "";
		hovering = false;
		return;
	}

	const feature = map.forEachFeatureAtPixel(pixel, (f) => f, {
		layerFilter: (layer) => layer.get("type") === "airport_main" || layer.get("type") === "pilot_main" || layer.get("type") === "controller_label",
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
		layerFilter: (layer) => layer.get("type") === "airport_main" || layer.get("type") === "pilot_main" || layer.get("type") === "controller_label",
		hitTolerance: 10,
	}) as Feature<Point> | undefined;

	if (feature !== clickedFeature && clickedOverlay) {
		map.removeOverlay(clickedOverlay);
		clickedOverlay = null;
		trackSource.clear();
		toggleControllerSectorHover(clickedFeature, false, "clicked");
	}

	if (feature && feature !== clickedFeature) {
		clickedOverlay = await createOverlay(feature);
		map.addOverlay(clickedOverlay);

		if (hoveredOverlay) {
			map.removeOverlay(hoveredOverlay);
			hoveredOverlay = null;
		}
	}

	if (feature !== clickedFeature) {
		clickedFeature?.set("clicked", false);
		clickedFeature = null;
	}

	if (!feature) {
		navigate?.(`/`);
	}

	feature?.set("clicked", true);
	clickedFeature = feature || null;

	toggleControllerSectorHover(feature, true, "clicked");

	const type = clickedFeature?.get("type");
	if (clickedFeature && type === "pilot") {
		const id = clickedFeature.getId()?.toString();
		initTrackFeatures(id || "");

		if (id) {
			const strippedId = id.toString().replace(/^pilot_/, "");
			navigate?.(`/pilot/${strippedId}`);
		}
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
				.replace(/^controller_/, "") || "";

		const cachedTracon = await getCachedTracon(id);
		const controllerMerged = getControllerMerged(`tracon_${id}`);
		root.render(<SectorOverlay cached={cachedTracon} merged={controllerMerged} />);
	}

	if (type === "fir") {
		id =
			feature
				.getId()
				?.toString()
				.replace(/^controller_/, "") || "";

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
				.replace(/^controller_/, "") || "";

		const cachedTracon = await getCachedTracon(id);
		const controllerMerged = getControllerMerged(`tracon_${id}`);
		root.render(<SectorOverlay cached={cachedTracon} merged={controllerMerged} />);
	}

	if (type === "fir") {
		id =
			feature
				.getId()
				?.toString()
				.replace(/^controller_/, "") || "";

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

export function showRouteOnMap(departure: StaticAirport, arrival: StaticAirport, toggle: boolean): void {
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

	lastExtent = view?.calculateExtent() || null;
	view?.fit(extent, {
		duration: 200,
		padding: [150, 100, 100, 468],
	});
}

let followInterval: NodeJS.Timeout | null = null;

export function followPilotOnMap(id: string, toggle: boolean): void {
	const view = getMapView();
	if (followInterval) {
		clearInterval(followInterval);
		followInterval = null;
	}

	if (!toggle && lastExtent) {
		view?.fit(lastExtent, {
			duration: 200,
		});
		lastExtent = null;
		return;
	}

	const feature = pilotMainSource.getFeatureById(`pilot_${id}`) as Feature<Point> | undefined;
	const geom = feature?.getGeometry();
	if (!geom) return;

	const follow = (geom: Point) => {
		const coords = geom.getCoordinates();
		if (coords) {
			view?.animate({
				center: coords,
				duration: 200,
			});
		}
	};

	lastExtent = view?.calculateExtent() || null;

	follow(geom);
	followInterval = setInterval(() => {
		follow(geom);
	}, 10_000);
}
