import { MapLibreLayer } from "@geoblocks/ol-maplibre-layer";
import type { StaticAirport } from "@sr24/types/db";
import type { AirportDelta, AirportShort, ControllerDelta, ControllerMerged, PilotDelta, PilotShort, TrackPoint } from "@sr24/types/interface";
import type { StyleSpecification } from "maplibre-gl";
import { type Feature, type MapBrowserEvent, Map as OlMap, type Overlay, View } from "ol";
import type BaseEvent from "ol/events/Event";
import type { Extent } from "ol/extent";
import type { Point } from "ol/geom";
import { fromLonLat, toLonLat, transformExtent } from "ol/proj";
import type { SelectOptionType } from "@/components/Select/Select";
import type { FilterValues, SettingValues } from "@/types/zustand";
import { AirportService } from "./AirportService";
import { ControllerService } from "./ControllerService";
import { createOverlay, updateOverlay } from "./overlays";
import { PilotService } from "./PilotService";
import styleDark from "./positron_dark.json";
import styleLight from "./positron_light.json";
import { Sunservice } from "./SunService";
import { TrackService } from "./TrackService";

type Options = {
	onNavigate?: (href: string) => void;
	autoTrackPoints?: boolean;
	disableInteractions?: boolean;
	disableCenterOnPageLoad?: boolean;
	sunTime?: Date;
};

export class MapService {
	private static readonly MAP_PADDING = [204, 116, 140, 436];
	private options: Options | null = null;

	private map: OlMap | null = null;
	private baseLayer: MapLibreLayer | null = null;

	private sunService = new Sunservice();
	private pilotService = new PilotService();
	private airportService = new AirportService();
	private controllerService = new ControllerService();
	private trackService = new TrackService();

	private hovering = false;
	private hoveredFeature: Feature<Point> | null = null;
	private clickedFeature: Feature<Point> | null = null;
	private hoveredOverlay: Overlay | null = null;
	private clickedOverlay: Overlay | null = null;

	private lastExtent: Extent | null = null;
	private lastSettings: Partial<SettingValues> = {};

	private storedControllers = new Map<string, ControllerMerged>();
	private storedAirports = new Map<string, AirportShort>();

	private animationTimestamp = 0;
	private animationFrame = 0;

	private followInterval: NodeJS.Timeout | null = null;

	public init(options?: Options): OlMap {
		if (options) {
			this.options = options;
		}

		const savedView = localStorage.getItem("simradar21-map-view");
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

		this.baseLayer = new MapLibreLayer({
			mapLibreOptions: {
				style: styleLight as StyleSpecification,
			},
			properties: { type: "base" },
		});

		const sunLayer = this.sunService.init(this.options?.sunTime);
		const pilotLayers = this.pilotService.init();
		const airportLayer = this.airportService.init();
		const controllerLayers = this.controllerService.init();
		const trackLayer = this.trackService.init();

		this.map = new OlMap({
			target: "map",
			layers: [this.baseLayer, sunLayer, ...pilotLayers, airportLayer, ...controllerLayers, trackLayer],
			view: new View({
				center: fromLonLat(center),
				zoom,
				maxZoom: 18,
				minZoom: 3,
				extent: transformExtent([-190, -80, 190, 80], "EPSG:4326", "EPSG:3857"),
			}),
			controls: [],
		});

		return this.map;
	}

	public setTheme(theme: string | undefined): void {
		const isDark = theme === "dark";
		const style = isDark ? (styleDark as StyleSpecification) : (styleLight as StyleSpecification);
		this.baseLayer?.mapLibreMap?.setStyle(style);

		this.sunService.setTheme(isDark);
		this.pilotService.setTheme(isDark);
		this.controllerService.setTheme(isDark);
	}

	public setSettings(settings: Partial<SettingValues>): void {
		this.sunService.setSettings({ show: settings.dayNightLayer, brightness: settings.dayNightLayerBrightness });
		this.pilotService.setSettings({ size: settings.planeMarkerSize });
		this.airportService.setSettings({ show: settings.airportMarkers, size: settings.airportMarkerSize });
		this.controllerService.setSettings({
			showSectors: settings.sectorAreas,
			firColor: settings.firColor,
			traconColor: settings.traconColor,
			showAirports: settings.airportMarkers,
			airportSize: settings.airportMarkerSize,
		});
		this.toggleAnimation(settings.animatedPlaneMarkers || false);

		this.lastSettings = settings;
	}

	public setFilters(filters?: Partial<Record<keyof FilterValues, SelectOptionType[] | number[]>>) {
		this.pilotService.setFilters(filters);
	}

	public setView({ rotation, zoomStep, center, zoom }: { rotation?: number; zoomStep?: number; center?: [number, number]; zoom?: number }): void {
		const view = this.map?.getView();
		if (!view) return;

		const currentZoom = zoom || view.getZoom() || 2;

		if (rotation !== undefined) {
			view.setRotation(rotation);
		}
		if (zoomStep !== undefined) {
			const newZoom = currentZoom + zoomStep;
			view.animate({
				zoom: newZoom,
				duration: 300,
			});
		}
		if (center !== undefined) {
			view.setCenter(fromLonLat(center));
		}
		if (zoom !== undefined) {
			view.setZoom(zoom);
		}
	}

	public addEventListeners() {
		this.map?.on("moveend", this.onMoveEnd);
		this.map?.on("pointermove", this.onPointerMove);
		if (!this.options?.disableInteractions) {
			this.map?.on("click", this.onClick);
		}
	}

	public removeEventListeners() {
		this.map?.un("moveend", this.onMoveEnd);
		this.map?.un("pointermove", this.onPointerMove);
		if (!this.options?.disableInteractions) {
			this.map?.un("click", this.onClick);
		}
	}

	private onMoveEnd = (e: BaseEvent | Event) => {
		const view: View = e.target.getView();
		const center = toLonLat(view.getCenter() || [0, 0]);
		const zoom = view.getZoom() || 2;

		this.renderFeatures();
		localStorage.setItem("simradar21-map-view", JSON.stringify({ center, zoom }));
	};

	private onPointerMove = async (e: MapBrowserEvent) => {
		if (this.hovering) return;
		this.hovering = true;

		const map = e.map;
		const pixel = e.pixel;

		if (!(e.originalEvent.target instanceof HTMLCanvasElement) && this.clickedFeature) {
			map.getTargetElement().style.cursor = "";
			this.hovering = false;

			if (this.hoveredOverlay) {
				map.removeOverlay(this.hoveredOverlay);
				this.hoveredOverlay = null;
				this.hoveredFeature?.set("hovered", false);
				this.hoveredFeature = null;
			}
			return;
		}

		const feature = map.forEachFeatureAtPixel(pixel, (f) => f, {
			layerFilter: (layer) => layer.get("type") === "airport_main" || layer.get("type") === "pilot_main" || layer.get("type") === "sector_label",
			hitTolerance: 10,
		}) as Feature<Point> | undefined;

		map.getTargetElement().style.cursor = feature ? "pointer" : "";

		if (feature !== this.hoveredFeature && this.hoveredOverlay) {
			map.removeOverlay(this.hoveredOverlay);
			this.hoveredOverlay = null;
		}

		if (feature && feature !== this.hoveredFeature && feature !== this.clickedFeature) {
			this.hoveredOverlay = await createOverlay(feature, this.getCachedAirport(feature), this.getCachedController(feature));
			map?.addOverlay(this.hoveredOverlay);
		}

		if (feature !== this.hoveredFeature) {
			this.controllerService.hoverSector(this.hoveredFeature, false, "hovered");
			this.hoveredFeature?.set("hovered", false);
			this.hoveredFeature = null;
		}

		this.controllerService.hoverSector(feature, true, "hovered");

		feature?.set("hovered", true);
		this.hoveredFeature = feature || null;

		this.hovering = false;
	};

	private onClick = async (e: MapBrowserEvent) => {
		const map = e.map;
		const pixel = e.pixel;

		const feature = map.forEachFeatureAtPixel(pixel, (f) => f, {
			layerFilter: (layer) => layer.get("type") === "airport_main" || layer.get("type") === "pilot_main" || layer.get("type") === "sector_label",
			hitTolerance: 10,
		}) as Feature<Point> | undefined;

		if (feature !== this.clickedFeature && this.clickedOverlay) {
			map.removeOverlay(this.clickedOverlay);
			this.clickedOverlay = null;
			this.clearMap();
		}

		if (feature && feature !== this.clickedFeature) {
			this.clickedOverlay = await createOverlay(feature, this.getCachedAirport(feature), this.getCachedController(feature));
			map?.addOverlay(this.clickedOverlay);

			this.hoveredOverlay && map.removeOverlay(this.hoveredOverlay);
			this.hoveredOverlay = null;
		}

		if (feature !== this.clickedFeature) {
			this.clickedFeature?.set("clicked", false);
			this.clickedFeature = null;
		}

		if (!feature) {
			this.options?.onNavigate?.(`/`);
			return;
		}

		this.unfocusFeatures();

		feature?.set("clicked", true);
		this.clickedFeature = feature || null;

		this.controllerService.hoverSector(feature, true, "clicked");

		if (!this.clickedFeature) return;

		const type = this.clickedFeature.get("type") as string | undefined;
		const id = this.clickedFeature.getId()?.toString() || null;
		if (type === "pilot" && id) {
			const strippedId = id.toString().replace(/^pilot_/, "");
			this.options?.onNavigate?.(`/pilot/${strippedId}`);
			this.pilotService.setHighlighted(strippedId);
		}

		if (type === "airport" && id) {
			const strippedId = id.toString().replace(/^airport_/, "");
			this.options?.onNavigate?.(`/airport/${strippedId}`);
			this.airportService.setHighlighted(strippedId);
		}

		if ((type === "tracon" || type === "fir") && id) {
			const strippedId = id.toString().replace(/^(sector)_/, "");
			this.options?.onNavigate?.(`/sector/${strippedId}`);
			this.controllerService.setHighlighted(strippedId);
		}

		this.renderFeatures();
	};

	private clearMap(): void {
		this.trackService.setFeatures([]);

		this.controllerService.hoverSector(this.clickedFeature, false, "clicked");
		this.pilotService.clearHighlighted();
		this.airportService.clearHighlighted();
		this.controllerService.clearHighlighted();

		this.unfollowPilot();
	}

	public resetMap(nav: boolean = true): void {
		this.clearMap();

		if (this.lastExtent) {
			this.map?.getView().fit(this.lastExtent, {
				duration: 200,
			});
			this.lastExtent = null;
		}

		if (this.clickedOverlay) {
			this.map?.removeOverlay(this.clickedOverlay);
			this.clickedOverlay = null;
		}
		this.clickedFeature?.set("clicked", false);
		this.clickedFeature = null;

		if (nav) {
			this.options?.onNavigate?.(`/`);
		}

		this.renderFeatures();
	}

	public async setFeatures({
		pilots,
		airports,
		controllers,
		trackPoints,
		autoTrackId,
		sunTime,
	}: {
		pilots?: Required<PilotShort>[];
		airports?: StaticAirport[];
		controllers?: ControllerMerged[];
		trackPoints?: TrackPoint[];
		autoTrackId?: string;
		sunTime?: Date;
	}): Promise<void> {
		if (pilots) {
			this.pilotService.setFeatures(pilots);
		}
		if (airports) {
			this.airportService.setFeatures(airports);
		}
		if (controllers) {
			await this.controllerService.setFeatures(controllers);
		}
		if (trackPoints) {
			this.trackService.setFeatures(trackPoints, autoTrackId);
		}
		if (sunTime) {
			this.sunService.setFeatures(sunTime);
		}

		this.renderFeatures();
	}

	public async revalidateFeatures({
		pilots,
		airports,
		controllers,
	}: {
		pilots?: Required<PilotShort>[];
		airports?: StaticAirport[];
		controllers?: ControllerMerged[];
	}): Promise<void> {
		if (pilots) {
			this.pilotService.updateFeatures({ added: pilots, updated: pilots });
		}
		if (airports) {
			// this.airportService.setFeatures(airports);
		}
		if (controllers) {
			await this.controllerService.updateFeatures({ added: controllers, updated: controllers });
		}

		this.updateRelatives();
		this.renderFeatures();
	}

	public async updateFeatures({
		pilots,
		airports,
		controllers,
		sunTime,
	}: {
		pilots?: PilotDelta;
		airports?: StaticAirport[];
		controllers?: ControllerDelta;
		sunTime?: Date;
	}): Promise<void> {
		let resetNeeded = false;

		if (pilots) {
			resetNeeded = this.pilotService.updateFeatures(pilots) || resetNeeded;
		}
		if (airports) {
			// resetNeeded = this.airportService.updateFeatures(airports) || resetNeeded;
		}
		if (controllers) {
			resetNeeded = (await this.controllerService.updateFeatures(controllers)) || resetNeeded;
		}
		if (sunTime) {
			this.sunService.setFeatures(sunTime);
		}

		this.updateRelatives();

		if (resetNeeded) {
			this.resetMap(true);
		}
	}

	private updateRelatives(): void {
		if (this.clickedFeature && this.clickedOverlay) {
			updateOverlay(
				this.clickedFeature,
				this.clickedOverlay,
				this.getCachedAirport(this.clickedFeature),
				this.getCachedController(this.clickedFeature),
			);
		}
		if (this.hoveredFeature && this.hoveredOverlay) {
			updateOverlay(
				this.hoveredFeature,
				this.hoveredOverlay,
				this.getCachedAirport(this.hoveredFeature),
				this.getCachedController(this.hoveredFeature),
			);
		}

		if (this.options?.autoTrackPoints) {
			this.trackService.updateFeatures(this.clickedFeature);
		}
	}

	public setStore({ airports, controllers }: { airports?: AirportShort[]; controllers?: ControllerMerged[] }): void {
		if (airports) {
			for (const airport of airports) {
				this.storedAirports.set(airport.icao, airport);
			}
		}
		if (controllers) {
			for (const controller of controllers) {
				this.storedControllers.set(controller.id, controller);
			}
		}
	}

	public updateStore({ airports, controllers }: { airports?: AirportDelta; controllers?: ControllerDelta }): void {
		if (airports) {
			const nextAirports = new Map<string, AirportShort>();

			for (const airport of airports.added) {
				nextAirports.set(airport.icao, airport);
			}

			for (const a of airports.updated) {
				const existing = this.storedAirports.get(a.icao);

				nextAirports.set(a.icao, {
					...existing,
					...a,
				});
			}
			this.storedAirports = nextAirports;
		}
		if (controllers) {
			const nextControllers = new Map<string, ControllerMerged>();

			for (const controller of controllers.added) {
				nextControllers.set(controller.id, controller);
			}

			for (const c of controllers.updated) {
				const existing = this.storedControllers.get(c.id);
				const controllers = c.controllers.map((ctl) => {
					const existingCtl = existing?.controllers.find((e) => e.callsign === ctl.callsign);
					return { ...existingCtl, ...ctl };
				});

				nextControllers.set(c.id, {
					...existing,
					...c,
					controllers,
				});
			}
			this.storedControllers = nextControllers;
		}
	}

	private renderFeatures() {
		const view = this.map?.getView();
		if (!view) return;

		const extent = view.calculateExtent();
		const zoom = view.getZoom() || 2;

		this.pilotService.renderFeatures(extent, zoom);
		this.airportService.renderFeatures(extent, zoom);
	}

	private toggleAnimation(enabled: boolean): void {
		if (!enabled) {
			window.cancelAnimationFrame(this.animationFrame);
			return;
		}

		const animate = () => {
			this.animateFeatures();
			this.animationFrame = window.requestAnimationFrame(animate);
		};
		this.animationFrame = window.requestAnimationFrame(animate);
	}

	private animateFeatures(): void {
		const resolution = this.map?.getView().getResolution() || 0;
		let interval = 1000;
		if (resolution > 1) {
			interval = Math.min(Math.max(resolution * 5, 40), 1000);
		}

		const now = Date.now();
		const elapsed = now - this.animationTimestamp;

		if (elapsed > interval) {
			this.pilotService.animateFeatures(elapsed);

			if (this.clickedOverlay) {
				if (this.clickedFeature) {
					const geom = this.clickedFeature.getGeometry();
					const coords = geom?.getCoordinates();
					this.clickedOverlay.setPosition(coords);
				}
			}
			if (this.hoveredOverlay) {
				if (this.hoveredFeature) {
					const geom = this.hoveredFeature.getGeometry();
					const coords = geom?.getCoordinates();
					this.hoveredOverlay.setPosition(coords);
				}
			}

			this.trackService.animateFeatures(this.clickedFeature);

			this.animationTimestamp = now;
		}
	}

	public setClickedFeature(type: string, id: string, init?: boolean): void {
		if (this.clickedFeature?.getId() === `${type}_${id}`) return;

		this.unfocusFeatures();

		if (!init) {
			this.resetMap(false);
		}

		const view = this.options?.disableCenterOnPageLoad ? undefined : this.map?.getView();

		if (type === "pilot") {
			this.clickedFeature = this.pilotService.moveToFeature(id, view);
		}
		if (type === "airport") {
			this.clickedFeature = this.airportService.moveToFeature(id, view);
		}
		if (type === "sector") {
			this.clickedFeature = this.controllerService.moveToFeature(id, view);
			this.controllerService.hoverSector(this.clickedFeature, true, "clicked");
		}

		if (this.clickedFeature) {
			this.clickedFeature.set("clicked", true);
			createOverlay(this.clickedFeature, this.getCachedAirport(this.clickedFeature), this.getCachedController(this.clickedFeature)).then(
				(overlay) => {
					this.clickedOverlay = overlay;
					this.map?.addOverlay(overlay);
				},
			);
		}
	}

	public setHoveredFeature(type?: string, id?: string): void {
		if (!id && !type && this.hoveredFeature) {
			this.hoveredFeature.set("hovered", false);
			this.controllerService.hoverSector(this.hoveredFeature, false, "hovered");
			this.hoveredFeature = null;

			this.hoveredOverlay && this.map?.removeOverlay(this.hoveredOverlay);
			this.hoveredOverlay = null;
			return;
		}

		if (!id || !type) return;

		if (type === "pilot") {
			this.hoveredFeature = this.pilotService.moveToFeature(id);
		}
		if (type === "airport") {
			this.hoveredFeature = this.airportService.moveToFeature(id);
		}
		if (type === "sector") {
			this.hoveredFeature = this.controllerService.moveToFeature(id);
			this.controllerService.hoverSector(this.hoveredFeature, true, "hovered");
		}

		if (this.hoveredFeature) {
			this.hoveredFeature.set("hovered", true);
			createOverlay(this.hoveredFeature, this.getCachedAirport(this.hoveredFeature), this.getCachedController(this.hoveredFeature)).then(
				(overlay) => {
					this.hoveredOverlay = overlay;
					this.map?.addOverlay(overlay);
				},
			);
		}
	}

	private getCachedAirport(feature: Feature<Point>): AirportShort | undefined {
		const id = feature
			.getId()
			?.toString()
			.replace(/^airport_/, "");
		return this.storedAirports.get(id || "");
	}

	private getCachedController(feature: Feature<Point>): ControllerMerged | undefined {
		const id = feature
			.getId()
			?.toString()
			.replace(/^(sector|airport)_/, "");
		const type = feature.get("type");
		return this.storedControllers.get(`${type}_${id}`);
	}

	private toggleLayerVisibility(layerTypes: ("airport" | "pilot" | "controller" | "track")[], visible: boolean): void {
		layerTypes.forEach((type) => {
			switch (type) {
				case "airport":
					this.airportService.setSettings({ show: visible ? this.lastSettings?.airportMarkers : false });
					break;
				case "pilot":
					this.pilotService.setSettings({ show: visible });
					break;
				case "controller":
					this.controllerService.setSettings({
						showSectors: visible ? this.lastSettings?.sectorAreas : false,
						showAirports: visible ? this.lastSettings?.airportMarkers : false,
					});
					break;
				case "track":
					this.trackService.setSettings({ show: visible });
					break;
			}
		});
	}

	public focusFeatures({
		pilots,
		airports,
		hideLayers,
	}: {
		pilots?: string[];
		airports?: string[];
		hideLayers?: ("airport" | "pilot" | "controller" | "track")[];
	}): void {
		if (pilots && pilots.length > 0) {
			this.pilotService.focusFeatures(pilots);
		}
		if (airports && airports.length > 0) {
			this.airportService.focusFeatures(airports);
		}

		if (hideLayers) {
			this.toggleLayerVisibility(hideLayers, false);
		}

		this.renderFeatures();
	}

	public unfocusFeatures(): void {
		this.pilotService.unfocusFeatures();
		this.airportService.unfocusFeatures();
		this.toggleLayerVisibility(["airport", "pilot", "controller", "track"], true);
	}

	public fitFeatures({ pilots, airports, rememberView = true }: { pilots?: string[]; airports?: string[]; rememberView?: boolean } = {}): void {
		const view = this.map?.getView();
		if (!view) return;

		if (pilots && pilots.length > 0) {
			const extent = this.pilotService.getExtent(pilots);
			if (extent) {
				if (rememberView) {
					this.lastExtent = view.calculateExtent();
				}
				view.fit(extent, {
					padding: MapService.MAP_PADDING,
					duration: 200,
					maxZoom: 14,
				});
			}

			return;
		}

		if (airports && airports.length > 0) {
			const extent = this.airportService.getExtent(airports);
			if (extent) {
				if (rememberView) {
					this.lastExtent = view.calculateExtent();
				}
				view.fit(extent, {
					padding: MapService.MAP_PADDING,
					duration: 200,
					maxZoom: 14,
				});
			}

			return;
		}

		if (this.lastExtent) {
			view.fit(this.lastExtent, {
				duration: 200,
			});
			this.lastExtent = null;
		}
	}

	public followPilot({ rememberView = true }: { rememberView?: boolean } = {}): void {
		this.unfollowPilot();

		const view = this.map?.getView();
		if (!view) return;

		if (this.lastExtent) {
			view.fit(this.lastExtent, {
				duration: 200,
			});
			this.lastExtent = null;
		}

		const type = this.clickedFeature?.get("type") as string | undefined;
		if (type !== "pilot") return;

		const follow = () => {
			console.log("Following pilot...");
			const geom = this.clickedFeature?.getGeometry();
			const coords = geom?.getCoordinates();
			if (coords) {
				view.animate({
					center: coords,
					duration: 200,
				});
			}
		};

		if (rememberView) {
			this.lastExtent = view.calculateExtent();
		}

		follow();
		this.followInterval = setInterval(follow, 3000);
	}

	public unfollowPilot(): void {
		if (this.followInterval) {
			clearInterval(this.followInterval);
			this.followInterval = null;
		}
	}
}
