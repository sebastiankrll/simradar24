import { MapLibreLayer } from "@geoblocks/ol-maplibre-layer";
import type { StaticAirport } from "@sr24/types/db";
import type { AirportDelta, AirportShort, ControllerDelta, ControllerMerged, PilotDelta, PilotShort, TrackPoint } from "@sr24/types/interface";
import type { StyleSpecification } from "maplibre-gl";
import { type Feature, MapBrowserEvent, Map as OlMap, type Overlay, View } from "ol";
import { click, pointerMove } from "ol/events/condition";
import type BaseEvent from "ol/events/Event";
import type { Extent } from "ol/extent";
import type { Point } from "ol/geom";
import Select, { type SelectEvent } from "ol/interaction/Select";
import type Layer from "ol/layer/Layer";
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
type Stats = {
	pilots: {
		total: number;
		rendered: number;
	};
};
type StatsListener = (stats: Stats) => void;

export class MapService {
	private static readonly MAP_PADDING = [204, 116, 140, 436];
	private static readonly HIT_TOLERANCE = 5;
	private static readonly LAYER_FILTER = (layer: Layer) => {
		const type = layer.get("type");
		return type === "airport_main" || type === "pilot_main" || type === "sector_label";
	};
	private options: Options | null = null;

	private map: OlMap | null = null;
	private baseLayer: MapLibreLayer | null = null;

	private sunService = new Sunservice();
	private pilotService = new PilotService();
	private airportService = new AirportService();
	private controllerService = new ControllerService();
	private trackService = new TrackService();

	private multiView = false;
	private multiPath = new Set<string>();
	private hoverToken = 0;
	private hoverFeature: Feature<Point> | null = null;
	private clickFeatures = new Map<string, Feature<Point>>();
	private hoverOverlay: Overlay | null = null;
	private clickOverlays = new Map<string, Overlay>();
	private hoverSelect: Select | undefined;
	private clickSelect: Select | undefined;

	private lastExtent: Extent | null = null;
	private lastSettings: Partial<SettingValues> = {};

	private storedControllers = new Map<string, ControllerMerged>();
	private storedAirports = new Map<string, AirportShort>();

	private animationTimestamp = 0;
	private animationFrame?: number;

	private followInterval: NodeJS.Timeout | null = null;

	private statsListeners = new Set<StatsListener>();

	subscribe(cb: StatsListener) {
		this.statsListeners.add(cb);
		return () => this.statsListeners.delete(cb);
	}

	public init(options?: Options): OlMap {
		if (options) {
			this.options = options;
		}

		const savedView = localStorage.getItem("simradar21-map-view");
		const initialCenter = [0, 0];
		const initialZoom = 2;

		let center = initialCenter;
		let zoom = initialZoom;
		let rotation = 0;

		if (savedView) {
			try {
				const parsed = JSON.parse(savedView) as {
					center: [number, number];
					zoom: number;
					rotation: number;
				};
				center = parsed.center;
				zoom = parsed.zoom;
				rotation = parsed.rotation;
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
				rotation,
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
		this.renderFeatures();
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

	public setMultiView(enabled: boolean, init?: boolean): void {
		this.multiView = enabled;
		if (!init) {
			this.resetMap();
		}
	}

	public addEventListeners() {
		this.map?.on("moveend", this.onMoveEnd);

		const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

		if (!isTouch) {
			this.hoverSelect = new Select({
				condition: pointerMove,
				hitTolerance: MapService.HIT_TOLERANCE,
				layers: MapService.LAYER_FILTER,
				style: null,
			});
			this.map?.addInteraction(this.hoverSelect);
			this.hoverSelect.on("select", this.onHoverSelect);
		}

		if (!this.options?.disableInteractions) {
			this.clickSelect = new Select({
				condition: click,
				toggleCondition: () => this.multiView,
				hitTolerance: MapService.HIT_TOLERANCE,
				layers: MapService.LAYER_FILTER,
				style: null,
				multi: true,
			});
			this.map?.addInteraction(this.clickSelect);
			this.clickSelect.on("select", this.onClickSelect);

			this.map?.on("singleclick", this.onMapClick);
		}
	}

	public removeEventListeners() {
		this.map?.un("moveend", this.onMoveEnd);
		if (this.hoverSelect) {
			this.hoverSelect.un("select", this.onHoverSelect);
			this.map?.removeInteraction(this.hoverSelect);
			this.hoverSelect = undefined;
		}
		if (this.clickSelect) {
			this.clickSelect.un("select", this.onClickSelect);
			this.map?.removeInteraction(this.clickSelect);
			this.clickSelect = undefined;

			this.map?.un("singleclick", this.onMapClick);
		}
	}

	private onMoveEnd = (e: BaseEvent | Event) => {
		const view: View = e.target.getView();
		const center = toLonLat(view.getCenter() || [0, 0]);
		const zoom = view.getZoom() || 2;
		const rotation = view.getRotation() || 0;

		this.renderFeatures();
		localStorage.setItem("simradar21-map-view", JSON.stringify({ center, zoom, rotation }));
	};

	private onHoverSelect = async (e: SelectEvent) => {
		const token = ++this.hoverToken;

		const map = e.mapBrowserEvent?.map || this.map;
		const selected = e.selected[0] as Feature<Point>;

		map.getTargetElement().style.cursor = selected ? "pointer" : "";

		if (this.hoverOverlay) {
			map.removeOverlay(this.hoverOverlay);
			this.hoverOverlay = null;
		}
		if (this.hoverFeature) {
			this.hoverFeature.set("hovered", false);
			this.controllerService.hoverSector(this.hoverFeature, false, "hovered");
			this.hoverFeature = null;
		}

		const id = selected?.getId()?.toString() || null;
		if (!id || this.clickFeatures.has(id)) return;

		selected.set("hovered", true);
		this.controllerService.hoverSector(selected, true, "hovered");

		const overlay = await createOverlay(selected, this.getCachedAirport(selected), this.getCachedController(selected));

		if (token !== this.hoverToken) {
			return;
		}

		this.hoverFeature = selected;
		this.hoverOverlay = overlay;
		map.addOverlay(overlay);
	};

	private onClickSelect = async (e: SelectEvent) => {
		const isManual = !!e.mapBrowserEvent;
		const map = e.mapBrowserEvent?.map || this.map;
		const selected = (this.multiView ? e.selected : [e.selected[0]]) as (Feature<Point> | undefined)[];
		const deselected = (this.multiView ? e.deselected : [e.deselected[0]]) as (Feature<Point> | undefined)[];

		for (const f of deselected) {
			const id = f?.getId()?.toString() || null;
			if (!id || !f) continue;

			const overlay = this.clickOverlays.get(id);
			if (overlay) {
				map.removeOverlay(overlay);
				this.clickOverlays.delete(id);
			}

			this.controllerService.hoverSector(f, false, "clicked");

			f.set("clicked", false);
			this.clickFeatures.delete(id);

			const type = f.get("type") as string | undefined;

			if (type === "pilot" && id) {
				const strippedId = id.toString().replace(/^pilot_/, "");
				this.navigate(strippedId, "pilot", isManual, "delete");
				this.pilotService.removeHighlighted(strippedId);
				this.trackService.removeFeatures(strippedId);
			}

			if (type === "airport" && id) {
				const strippedId = id.toString().replace(/^airport_/, "");
				this.navigate(strippedId, "airport", isManual, "delete");
				this.airportService.removeHighlighted(strippedId);
			}

			if ((type === "tracon" || type === "fir") && id) {
				const strippedId = id.toString().replace(/^(sector)_/, "");
				this.navigate(strippedId, "sector", isManual, "delete");
				this.controllerService.removeHighlighted(strippedId);
			}
		}

		for (const f of selected) {
			const id = f?.getId()?.toString() || null;
			if (!id || !f) continue;

			const overlay = await createOverlay(f, this.getCachedAirport(f), this.getCachedController(f));
			map.addOverlay(overlay);
			this.clickOverlays.set(id, overlay);

			f.set("clicked", true);
			this.clickFeatures.set(id, f);

			this.controllerService.hoverSector(f, true, "clicked");

			const type = f.get("type") as string | undefined;

			if (type === "pilot" && id) {
				const strippedId = id.toString().replace(/^pilot_/, "");
				this.navigate(strippedId, "pilot", isManual, "add");
				this.pilotService.addHighlighted(strippedId);
			}

			if (type === "airport" && id) {
				const strippedId = id.toString().replace(/^airport_/, "");
				this.navigate(strippedId, "airport", isManual, "add");
				this.airportService.addHighlighted(strippedId);
			}

			if ((type === "tracon" || type === "fir") && id) {
				const strippedId = id.toString().replace(/^(sector)_/, "");
				this.navigate(strippedId, "sector", isManual, "add");
				this.controllerService.addHighlighted(strippedId);
			}
		}

		if (selected[0]) {
			this.unfocusFeatures();
		}
	};

	private onMapClick = (e: MapBrowserEvent) => {
		const map = e.map;

		const hit = map.hasFeatureAtPixel(e.pixel, {
			hitTolerance: MapService.HIT_TOLERANCE,
			layerFilter: MapService.LAYER_FILTER,
		});

		if (!hit) {
			this.resetMap();
		}
	};

	private navigate(id: string, type: string, isManual: boolean, mode: "add" | "delete"): void {
		if (!this.multiView && isManual) {
			this.options?.onNavigate?.(mode === "add" ? `/${type}/${id}` : `/`);
			return;
		}

		this.multiPath[mode](`${type}_${id}`);

		if (!isManual) return;

		if (this.multiPath.size > 0) {
			const path = Array.from(this.multiPath).join("%2C");
			this.options?.onNavigate?.(`/multi/${path}`);
		} else {
			this.options?.onNavigate?.(`/multi`);
		}
	}

	private clearMap(): void {
		this.trackService.clearFeatures();

		for (const feature of this.clickFeatures.values()) {
			this.controllerService.hoverSector(feature, false, "clicked");
		}
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

		for (const feature of this.clickFeatures.values()) {
			this.clickSelect?.toggleFeature(feature);
		}

		if (nav) {
			this.options?.onNavigate?.(this.multiView ? `/multi` : `/`);
			this.multiPath.clear();
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
		if (trackPoints && autoTrackId) {
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

		this.renderFeatures();
	}

	private updateRelatives(): void {
		for (const feature of this.clickFeatures.values()) {
			const id = feature.getId()?.toString() || null;
			if (!id) continue;

			const overlay = this.clickOverlays.get(id);
			if (!overlay) continue;

			updateOverlay(feature, overlay, this.getCachedAirport(feature), this.getCachedController(feature));
		}

		if (this.hoverFeature && this.hoverOverlay) {
			updateOverlay(this.hoverFeature, this.hoverOverlay, this.getCachedAirport(this.hoverFeature), this.getCachedController(this.hoverFeature));
		}

		if (this.options?.autoTrackPoints) {
			for (const feature of this.clickFeatures.values()) {
				const type = feature.get("type") as string | undefined;
				const id = feature.getId()?.toString() || null;
				if (type !== "pilot" || !id) continue;

				this.trackService.updateFeatures(feature, id.replace(/^pilot_/, ""));
			}
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
		const resolution = view.getResolution() || 0;

		this.pilotService.renderFeatures(extent, resolution);
		this.airportService.renderFeatures(extent, resolution);

		this.emit();
	}

	private toggleAnimation(enabled: boolean): void {
		if (!enabled) {
			if (this.animationFrame) {
				cancelAnimationFrame(this.animationFrame);
				this.animationFrame = undefined;
			}
			return;
		}

		this.animationTimestamp = performance.now();

		const tick = (now: number) => {
			const elapsed = now - this.animationTimestamp;

			const resolution = this.map?.getView().getResolution() ?? 0;
			const target = Math.min(Math.max(resolution * 5, 200), 2000);

			if (elapsed >= target) {
				this.animateTick(elapsed);
				this.animationTimestamp = now;
			}

			this.animationFrame = requestAnimationFrame(tick);
		};
		this.animationFrame = requestAnimationFrame(tick);
	}

	private animateTick(elapsed: number): void {
		this.pilotService.animateFeatures(elapsed);

		for (const feature of this.clickFeatures.values()) {
			const id = feature.getId()?.toString() || null;
			const type = feature.get("type") as string | undefined;
			if (type !== "pilot" || !id) continue;

			const overlay = this.clickOverlays.get(id);
			if (overlay) {
				this.clickOverlays.set(id, overlay);
				updateOverlay(feature, overlay, this.getCachedAirport(feature), this.getCachedController(feature));
			}

			this.trackService.animateFeatures(id, feature);
		}

		if (this.hoverOverlay && this.hoverFeature?.getGeometry()) {
			this.hoverOverlay.setPosition(this.hoverFeature.getGeometry()?.getCoordinates());
		}
	}

	public setClickedFeature(type: string | undefined, id: string | undefined, init?: boolean): void {
		if (!id || !type) return;
		if (!this.multiView && this.clickFeatures?.get(`${type}_${id}`)) return;

		this.unfocusFeatures();
		if (!init && !this.multiView) {
			this.resetMap(false);
		}

		const view = this.options?.disableCenterOnPageLoad || this.multiView ? undefined : this.map?.getView();
		const ids = this.multiView ? id.split("%2C") : [`${type}_${id}`];

		for (const fullId of ids) {
			const [t, i] = fullId.split("_");
			let clickFeature: Feature<Point> | null = null;

			if (t === "pilot") {
				clickFeature = this.pilotService.moveToFeature(i, view);
			}
			if (t === "airport") {
				clickFeature = this.airportService.moveToFeature(i, view);
			}
			if (t === "sector") {
				clickFeature = this.controllerService.moveToFeature(i, view);
			}

			const id = clickFeature?.getId()?.toString() || null;
			if (!id || !clickFeature || this.clickFeatures?.get(id)) continue;

			this.clickSelect?.toggleFeature(clickFeature);
		}
	}

	public async setHoveredFeature(type?: string, id?: string): Promise<void> {
		if (!id && !type && this.hoverFeature) {
			this.hoverSelect?.toggleFeature(this.hoverFeature);
			return;
		}

		if (!id || !type) return;

		if (type === "pilot") {
			this.hoverFeature = this.pilotService.moveToFeature(id);
		}
		if (type === "airport") {
			this.hoverFeature = this.airportService.moveToFeature(id);
		}
		if (type === "sector") {
			this.hoverFeature = this.controllerService.moveToFeature(id);
		}

		if (this.hoverFeature) {
			this.hoverSelect?.toggleFeature(this.hoverFeature);
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

		this.renderFeatures();
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

		const clickFeature = this.clickFeatures.values().next().value as Feature<Point> | undefined;
		const type = clickFeature?.get("type") as string | undefined;
		if (type !== "pilot" || !clickFeature) return;

		const follow = () => {
			const geom = clickFeature.getGeometry();
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

	private emit() {
		this.statsListeners.forEach((cb) => {
			const pilotStats = this.pilotService.getStats();
			cb({
				pilots: {
					total: pilotStats.total,
					rendered: pilotStats.rendered,
				},
			});
		});
	}
}
