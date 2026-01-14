import { MapLibreLayer } from "@geoblocks/ol-maplibre-layer";
import type { StaticAirport } from "@sr24/types/db";
import type { AirportShort, ControllerMerged, PilotShort } from "@sr24/types/interface";
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
import { createOverlay } from "./overlays";
import { PilotService } from "./PilotService";
import styleDark from "./positron_dark.json";
import styleLight from "./positron_light.json";
import { Sunservice } from "./SunService";
import { TrackService } from "./TrackService";

type Options = {
	onNavigate?: (href: string) => void;
};

export class MapService {
	private static readonly MAP_PADDING = [204, 116, 140, 436] as const;
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

	private cachedControllers = new Map<string, ControllerMerged>();
	private cachedAirports = new Map<string, AirportShort>();

	public init({ options }: { options?: Options }): OlMap {
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

		const sunLayer = this.sunService.init();
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

	public setTheme(theme: "light" | "dark"): void {
		const isDark = theme === "dark";
		const style = isDark ? (styleDark as StyleSpecification) : (styleLight as StyleSpecification);
		this.baseLayer?.mapLibreMap?.setStyle(style);

		this.sunService.setTheme(isDark);
		this.pilotService.setTheme(isDark);
		this.controllerService.setTheme(isDark);
	}

	public setSettings({ settings }: { settings: Partial<SettingValues> }): void {
		this.sunService.setSettings(settings.dayNightLayer, settings.dayNightLayerBrightness);
	}

	public setFilters(filters: Partial<Record<keyof FilterValues, SelectOptionType[] | number[]>>) {
		this.pilotService.setFilters(filters);
		this.renderFeatures();
	}

	public setRotation(rotation: number) {
		this.map?.getView().setRotation(rotation);
	}

	public addEventListeners() {
		this.map?.on("moveend", this.onMoveEnd);
		this.map?.on("pointermove", this.onPointerMove);
		this.map?.on("click", this.onClick);
	}

	public removeEventListeners() {
		this.map?.un("moveend", this.onMoveEnd);
		this.map?.un("pointermove", this.onPointerMove);
		this.map?.un("click", this.onClick);
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
			this.hoveredOverlay = await createOverlay(feature);
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
			this.clickedOverlay = await createOverlay(feature);
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

		feature?.set("clicked", true);
		this.clickedFeature = feature || null;

		this.controllerService.hoverSector(feature, true, "clicked");

		if (!this.clickedFeature) return;
		const type = this.clickedFeature.get("type") as string | undefined;
		const id = this.clickedFeature.getId()?.toString() || null;
		if (type === "pilot" && id) {
			// initTrackFeatures(id);

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
	};

	private clearMap(): void {
		// trackSource.clear();
		// clearCachedTrackPoints();

		this.controllerService.hoverSector(this.clickedFeature, false, "clicked");
		this.pilotService.clearHighlighted();
		this.airportService.clearHighlighted();
		this.controllerService.clearHighlighted();

		// if (followInterval) {
		// 	clearInterval(followInterval);
		// 	followInterval = null;
		// }
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
	}

	public setFeatures({
		pilots,
		airports,
		controllers,
	}: {
		pilots?: PilotShort[];
		airports?: StaticAirport[];
		controllers?: ControllerMerged[];
	}): void {
		if (pilots) {
			this.pilotService.setFeatures(pilots);
		}
		if (airports) {
			this.airportService.setFeatures(airports);
		}
		if (controllers) {
			this.controllerService.setFeatures(controllers);
		}
	}

	public setCache({ airports, controllers }: { airports?: AirportShort[]; controllers?: ControllerMerged[] }): void {
		if (airports) {
			for (const airport of airports) {
				this.cachedAirports.set(airport.icao, airport);
			}
		}
		if (controllers) {
			for (const controller of controllers) {
				this.cachedControllers.set(controller.id, controller);
			}
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

	public setClickedFeature(type: string, id: string): void {
		if (this.clickedFeature?.getId() === `${type}_${id}`) return;

		this.resetMap(false);

		if (type === "pilot") {
			this.clickedFeature = this.pilotService.moveToFeature(id, this.map?.getView());
			// initTrackFeatures(`pilot_${id}`);
		}
		if (type === "airport") {
			this.clickedFeature = this.airportService.moveToFeature(id, this.map?.getView());
		}
		if (type === "sector") {
			this.clickedFeature = this.controllerService.moveToFeature(id, this.map?.getView());
			this.controllerService.hoverSector(this.clickedFeature, true, "clicked");
		}

		if (this.clickedFeature) {
			this.clickedFeature.set("clicked", true);
			createOverlay(this.clickedFeature).then((overlay) => {
				this.clickedOverlay = overlay;
				this.map?.addOverlay(overlay);
			});
		}
	}
}
